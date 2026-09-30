import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/**
 * Guards feed URLs against SSRF.
 *
 * Anyone who can add a feed controls a URL that this server will later fetch
 * with its own network position. Without a check, `/api/sources` becomes a
 * proxy into whatever the host can reach: the cloud metadata service, a
 * database on localhost, an internal admin panel.
 *
 * Two checks, because either alone is bypassable:
 *
 * 1. Parse and inspect the hostname. Catches literal IPs and obvious names.
 * 2. Resolve the hostname and inspect every address it returns. This is the
 *    one that matters: `localtest.me` and `spoofed.burpcollaborator.net` are
 *    public names that resolve to private addresses, and a check on the string
 *    alone waves them straight through.
 *
 * There is a residual DNS-rebinding window between resolving and connecting.
 * Closing that fully needs a pinned-IP HTTP client; for a feed collector whose
 * feeds are configured by the operator, validating on save and again on fetch
 * is the proportionate control.
 */

export type UrlCheck =
  | { ok: true; hostname: string; addresses: string[] }
  | { ok: false; reason: string };

/** IPv4 ranges that must never be reachable through a feed URL. */
const BLOCKED_V4: Array<[string, number, string]> = [
  ["0.0.0.0", 8, "this network"],
  ["10.0.0.0", 8, "private network"],
  ["100.64.0.0", 10, "carrier-grade NAT"],
  ["127.0.0.0", 8, "localhost"],
  ["169.254.0.0", 16, "link-local, including cloud metadata"],
  ["172.16.0.0", 12, "private network"],
  ["192.0.0.0", 24, "IETF protocol assignments"],
  ["192.0.2.0", 24, "documentation range"],
  ["192.168.0.0", 16, "private network"],
  ["198.18.0.0", 15, "benchmarking range"],
  ["198.51.100.0", 24, "documentation range"],
  ["203.0.113.0", 24, "documentation range"],
  ["224.0.0.0", 4, "multicast"],
  ["240.0.0.0", 4, "reserved"],
];

function v4ToInt(ip: string): number {
  return ip
    .split(".")
    .reduce((total, octet) => (total << 8) + Number(octet), 0) >>> 0;
}

function inV4Range(ip: string): string | null {
  const value = v4ToInt(ip);
  for (const [base, bits, label] of BLOCKED_V4) {
    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
    if ((value & mask) === (v4ToInt(base) & mask)) return label;
  }
  return null;
}

function checkV6(ip: string): string | null {
  const address = ip.toLowerCase().split("%")[0];
  // ::1 loopback, :: unspecified, fc00::/7 unique-local, fe80::/10 link-local,
  // ::ffff:0:0/96 IPv4-mapped (checked as IPv4 below), 64:ff9b::/96 NAT64.
  if (address === "::1") return "localhost";
  if (address === "::") return "this network";
  if (address.startsWith("fc") || address.startsWith("fd")) return "unique-local address";
  if (/^fe[89ab]/.test(address)) return "link-local address";
  if (address.startsWith("ff")) return "multicast";
  const mapped = address.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return inV4Range(mapped[1]) ?? "IPv4-mapped address";
  return null;
}

/** Returns a label if the literal address is one we refuse to fetch. */
export function blockedAddressReason(ip: string): string | null {
  const version = isIP(ip);
  if (version === 4) return inV4Range(ip);
  if (version === 6) return checkV6(ip);
  return "unrecognised address";
}

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "ip6-localhost",
  "ip6-loopback",
  "metadata",
  "metadata.google.internal",
  "instance-data",
]);

/**
 * Validates a feed URL: protocol, hostname and every address it resolves to.
 * `resolve` is injectable so the rules can be tested without DNS.
 */
export async function checkFeedUrl(raw: string, resolve = defaultResolve): Promise<UrlCheck> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, reason: "url must be a valid absolute URL" };
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return { ok: false, reason: `protocol must be http or https, got ${url.protocol.replace(":", "")}` };
  }

  // `url.hostname` keeps the brackets on an IPv6 literal ("[::1]"), but
  // isIP() and the range checks expect the bare address.
  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    return { ok: false, reason: `${hostname} points at this machine, not a publisher` };
  }

  // Non-standard ports are how people reach things like local admin panels.
  const port = url.port || (url.protocol === "https:" ? "443" : "80");
  if (port !== "80" && port !== "443") {
    return { ok: false, reason: `port ${port} is not allowed; feeds must use http or https on 80/443` };
  }

  const literal = isIP(hostname);
  if (literal) {
    const reason = blockedAddressReason(hostname);
    return reason
      ? { ok: false, reason: `${hostname} is ${reason}` }
      : { ok: true, hostname, addresses: [hostname] };
  }

  let addresses: string[];
  try {
    addresses = await resolve(hostname);
  } catch (error) {
    return { ok: false, reason: `could not resolve ${hostname}: ${(error as Error).message}` };
  }

  if (addresses.length === 0) {
    return { ok: false, reason: `${hostname} did not resolve to any address` };
  }

  for (const address of addresses) {
    const reason = blockedAddressReason(address);
    if (reason) {
      return {
        ok: false,
        reason: `${hostname} resolves to ${address}, which is ${reason}`,
      };
    }
  }

  return { ok: true, hostname, addresses };
}

async function defaultResolve(hostname: string): Promise<string[]> {
  const results = await lookup(hostname, { all: true, verbatim: true });
  return results.map((entry) => entry.address);
}
