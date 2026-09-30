import { blockedAddressReason, checkFeedUrl } from "../src/lib/feedUrl";

/**
 * The feed collector fetches any URL an admin adds, using the server's own
 * network position. These cases pin down the addresses that must never be
 * reachable that way, including public hostnames that resolve inward, which a
 * string check on the hostname alone would not catch.
 */

const shouldBlock: string[] = [
  "http://127.0.0.1/feed.xml",
  "http://localhost:3000/api/ingest",
  "http://[::1]/feed.xml",
  "http://0.0.0.0/feed.xml",
  "http://10.1.2.3/internal.xml",
  "http://192.168.1.1/admin",
  "http://172.16.0.5/feed.xml",
  "http://169.254.169.254/latest/meta-data/iam/security-credentials/",
  "http://metadata.google.internal/computeMetadata/v1/",
  "http://100.64.0.1/feed.xml",
  "http://[fd00::1]/feed.xml",
  "http://[fe80::1]/feed.xml",
  "http://2130706433/feed.xml",
  "file:///etc/passwd",
  "gopher://example.com/",
  "http://example.com:8080/feed.xml",
  "http://example.com:22/feed.xml",
];

const shouldAllow: string[] = [
  "https://feeds.bbci.co.uk/sport/rss.xml",
  "http://www.skysports.com/rss/12040",
  "https://www.theguardian.com/uk/football/rss",
];

let failures = 0;

console.log("must be blocked:");
for (const url of shouldBlock) {
  const result = await checkFeedUrl(url, async () => ["93.184.216.34"]);
  if (result.ok) failures++;
  console.log(`  ${result.ok ? "FAIL" : "PASS"} ${url.slice(0, 58)}`);
  if (!result.ok) console.log(`         -> ${result.reason}`);
}

console.log("\nmust be allowed:");
for (const url of shouldAllow) {
  const result = await checkFeedUrl(url, async () => ["93.184.216.34"]);
  if (!result.ok) failures++;
  console.log(`  ${result.ok ? "PASS" : "FAIL"} ${url.slice(0, 58)}`);
  if (!result.ok) console.log(`         -> ${result.reason}`);
}

console.log("\npublic name resolving to a private address:");
const rebind = await checkFeedUrl("https://localtest.me/feed.xml", async () => ["127.0.0.1"]);
if (rebind.ok) failures++;
console.log(`  ${rebind.ok ? "FAIL" : "PASS"} localtest.me -> 127.0.0.1`);
if (!rebind.ok) console.log(`         -> ${rebind.reason}`);

console.log("\npublic name resolving to cloud metadata:");
const metadata = await checkFeedUrl("https://spoofed.example/feed.xml", async () => ["169.254.169.254"]);
if (metadata.ok) failures++;
console.log(`  ${metadata.ok ? "FAIL" : "PASS"} spoofed.example -> 169.254.169.254`);
if (!metadata.ok) console.log(`         -> ${metadata.reason}`);

console.log("\npublic name resolving to several addresses, one of them private:");
const mixed = await checkFeedUrl("https://split.example/feed.xml", async () => [
  "93.184.216.34",
  "10.0.0.5",
]);
if (mixed.ok) failures++;
console.log(`  ${mixed.ok ? "FAIL" : "PASS"} split.example -> [public, private]`);

console.log("\naddress classifier:");
const literals: Array<[string, boolean]> = [
  ["8.8.8.8", false],
  ["93.184.216.34", false],
  ["1.1.1.1", false],
  ["127.0.0.1", true],
  ["10.255.255.254", true],
  ["172.31.255.255", true],
  ["172.32.0.1", false],
  ["192.168.0.1", true],
  ["169.254.169.254", true],
  ["100.127.255.255", true],
  ["100.128.0.1", false],
  ["::1", true],
  ["fd12:3456::1", true],
  ["2606:4700:4700::1111", false],
];
for (const [ip, shouldBeBlocked] of literals) {
  const blocked = blockedAddressReason(ip) !== null;
  if (blocked !== shouldBeBlocked) failures++;
  console.log(`  ${blocked === shouldBeBlocked ? "PASS" : "FAIL"} ${ip.padEnd(24)} ${blocked ? "blocked" : "allowed"}`);
}

console.log(`\n${failures === 0 ? "ALL SSRF CASES PASS" : `${failures} SSRF CASES FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
