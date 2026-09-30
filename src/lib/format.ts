export function timeAgo(input: string | Date, now: Date = new Date()): string {
  const date = typeof input === "string" ? new Date(input) : input;
  const seconds = Math.round((now.getTime() - date.getTime()) / 1000);

  if (Number.isNaN(seconds)) return "";
  if (seconds < 0) return "just now";
  if (seconds < 45) return "just now";

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;

  const days = Math.round(hours / 24);
  if (days < 7) return `${days} ${days === 1 ? "day" : "days"} ago`;

  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: date.getFullYear() === now.getFullYear() ? undefined : "numeric" });
}

export function absoluteTime(input: string): string {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** True for stories published within the last 90 minutes. */
export function isBreaking(input: string, now: Date = new Date()): boolean {
  const published = new Date(input).getTime();
  if (Number.isNaN(published)) return false;
  return now.getTime() - published < 90 * 60_000;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

export function pluralise(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
