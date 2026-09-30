"use client";

import { useEffect, useState } from "react";

import { timeAgo } from "@/lib/format";

/**
 * Renders a relative timestamp that keeps itself fresh. Server-rendered HTML
 * would freeze at build time, so anything that says "5 min ago" is hydrated
 * here and recomputed on an interval.
 */
export default function TimeAgo({
  value,
  className = "",
  intervalMs = 30_000,
}: {
  value: string;
  className?: string;
  intervalMs?: number;
}) {
  const [label, setLabel] = useState(() => timeAgo(value));

  useEffect(() => {
    setLabel(timeAgo(value));
    const timer = setInterval(() => setLabel(timeAgo(value)), intervalMs);
    return () => clearInterval(timer);
  }, [value, intervalMs]);

  return (
    <time className={className} dateTime={value} suppressHydrationWarning>
      {label}
    </time>
  );
}
