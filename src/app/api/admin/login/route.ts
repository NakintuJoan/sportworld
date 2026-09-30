import { NextResponse } from "next/server";

import { createSessionToken, isAdminConfigured, sessionCookieOptions, verifyPassword, ADMIN_COOKIE } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/login  { password }
 *
 * Sets the signed admin session cookie on success. There is deliberately no
 * username: this is a single-operator tool, and one strong password is a
 * better trade than a shared account name that gets written on a sticky note.
 *
 * A wrong password is rejected without revealing which part was wrong, and
 * the response is marked no-store so a password cannot linger in a cache.
 */
export async function POST(request: Request) {
  if (!isAdminConfigured()) {
    return NextResponse.json(
      { error: "Admin access is not configured. Set ADMIN_PASSWORD in your environment." },
      { status: 503 },
    );
  }

  let password = "";
  try {
    const body = (await request.json()) as { password?: unknown };
    if (typeof body.password === "string") password = body.password;
  } catch {
    return NextResponse.json({ error: "Body must be valid JSON" }, { status: 400 });
  }

  const result = verifyPassword(password);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE.name, createSessionToken(), sessionCookieOptions());
  return response;
}

/** DELETE /api/admin/login - clear the session. */
export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE.name, "", { ...sessionCookieOptions(), maxAge: 0 });
  return response;
}
