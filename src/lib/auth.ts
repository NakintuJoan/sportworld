import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Admin authentication.
 *
 * Two independent credentials, because they protect different things:
 *
 * - `ADMIN_PASSWORD`  guards the /admin UI and the mutating API routes. A
 *   human logs in once and gets an httpOnly signed cookie.
 * - `CRON_SECRET`     guards scheduled ingest runs. A cron service cannot hold
 *   a cookie, so it sends `Authorization: Bearer <CRON_SECRET>` instead.
 *
 * Both fail closed. If a route accepts a write and neither credential is
 * configured, the request is denied rather than allowed, because "no secret
 * set" is exactly the state that leaves an open endpoint on the internet.
 *
 * The cookie is HMAC-signed rather than encrypted: it carries an expiry and
 * nothing secret, and verifying a signature needs no key schedule.
 */

const COOKIE_NAME = "sw_admin";
const SESSION_HOURS = 12;
const PASSWORD_MIN_LENGTH = 8;

function env(name: string): string {
  return (process.env[name] ?? "").trim();
}

/** True when the operator has configured enough for the admin UI to work. */
export function isAdminConfigured(): boolean {
  return adminPassword().length > 0;
}

function adminPassword(): string {
  return env("ADMIN_PASSWORD");
}

function sessionSecret(): string {
  // A dedicated secret is preferred, but a missing one must not silently
  // weaken signing, so fall back to the password rather than to a constant.
  return env("SESSION_SECRET") || adminPassword();
}

/** Constant-time string compare that does not leak length through timing. */
function safeEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  // timingSafeEqual throws on length mismatch, so compare fixed-width digests
  // of the two values instead of the values themselves.
  const digestA = createHmac("sha256", "sw-compare").update(bufferA).digest();
  const digestB = createHmac("sha256", "sw-compare").update(bufferB).digest();
  return timingSafeEqual(digestA, digestB);
}

export type LoginResult = { ok: true } | { ok: false; error: string };

/**
 * Checks a submitted password.
 *
 * A short password is refused outright rather than accepted and warned about:
 * `ADMIN_PASSWORD=admin` is a plausible thing to type, and a weak admin
 * credential is worse than an obvious error message.
 */
export function verifyPassword(submitted: string): LoginResult {
  const expected = adminPassword();
  if (!expected) {
    return { ok: false, error: "Admin access is not configured on this server." };
  }
  if (expected.length < PASSWORD_MIN_LENGTH) {
    return {
      ok: false,
      error: `ADMIN_PASSWORD is too short. Use at least ${PASSWORD_MIN_LENGTH} characters.`,
    };
  }
  if (!safeEqual(submitted, expected)) {
    return { ok: false, error: "Incorrect password." };
  }
  return { ok: true };
}

function sign(payload: string): string {
  return createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
}

/** Creates the signed session value stored in the cookie. */
export function createSessionToken(): string {
  const expiresAt = Date.now() + SESSION_HOURS * 3_600_000;
  const payload = Buffer.from(
    JSON.stringify({ sub: "admin", exp: expiresAt, nonce: randomBytes(8).toString("hex") })
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export type SessionState = { authenticated: boolean; reason?: "missing" | "invalid" | "expired" | "unconfigured" };

/** Verifies a cookie value. Never throws, whatever it is handed. */
export function verifySessionToken(token: string | undefined): SessionState {
  if (!token) return { authenticated: false, reason: "missing" };
  if (!sessionSecret()) return { authenticated: false, reason: "unconfigured" };

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return { authenticated: false, reason: "invalid" };
  if (!safeEqual(signature, sign(payload))) return { authenticated: false, reason: "invalid" };

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { exp?: number };
    if (typeof parsed.exp !== "number" || Date.now() > parsed.exp) {
      return { authenticated: false, reason: "expired" };
    }
  } catch {
    return { authenticated: false, reason: "invalid" };
  }
  return { authenticated: true };
}

/** Reads the session cookie out of a Request. */
export function readSession(request: Request): SessionState {
  const header = request.headers.get("cookie") ?? "";
  const match = header.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]*)`));
  return verifySessionToken(match?.[1]);
}

/** True when the request carries a valid admin session cookie. */
export function isAdminRequest(request: Request): boolean {
  return readSession(request).authenticated;
}

/** True when the request carries the cron bearer token, if one is configured. */
export function isCronRequest(request: Request): boolean {
  const secret = env("CRON_SECRET");
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

/**
 * The single gate for anything that writes: an admin cookie, or the cron
 * token. Denies by default when neither credential is configured.
 */
export function isAuthorised(request: Request): boolean {
  return isAdminRequest(request) || isCronRequest(request);
}

export const ADMIN_COOKIE = {
  name: COOKIE_NAME,
  maxAge: SESSION_HOURS * 3_600,
};

/** Cookie attributes for setting and clearing the session. */
export function sessionCookieOptions(): {
  httpOnly: boolean;
  sameSite: "lax";
  path: string;
  maxAge: number;
  secure: boolean;
} {
  return {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_COOKIE.maxAge,
    // Only mark Secure in production, otherwise the cookie is dropped over
    // plain http://localhost and the operator cannot log in locally.
    secure: process.env.NODE_ENV === "production",
  };
}
