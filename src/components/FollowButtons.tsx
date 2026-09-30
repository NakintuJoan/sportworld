"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useFollowing } from "./FollowProvider";

export function FollowTeamButton({ team, className = "btn" }: { team: string; className?: string }) {
  const { isFollowingTeam, toggleTeam, ready } = useFollowing();
  const following = isFollowingTeam(team);

  if (!ready) {
    return <span className={`${className} pointer-events-none opacity-50`}>☆ Follow</span>;
  }

  return (
    <button type="button" onClick={() => toggleTeam(team)} aria-pressed={following} className={className}>
      <span aria-hidden>{following ? "★" : "☆"}</span>
      {following ? "Following" : "Follow"}
    </button>
  );
}

export function FollowCategoryButton({ slug, label }: { slug: string; label: string }) {
  const { isFollowingCategory, toggleCategory, ready } = useFollowing();
  const following = isFollowingCategory(slug);

  if (!ready) {
    return <span className="btn pointer-events-none opacity-50">☆ Follow {label}</span>;
  }

  return (
    <button
      type="button"
      onClick={() => toggleCategory(slug)}
      aria-pressed={following}
      className={`btn ${following ? "border-brand-500/60 bg-brand-500/15 text-brand-200" : ""}`}
    >
      <span aria-hidden>{following ? "★" : "☆"}</span>
      {following ? "Following" : "Follow"} {label}
    </button>
  );
}

export function FollowSourceButton({ sourceId, sourceName }: { sourceId: string; sourceName: string }) {
  const { isFollowingSource, toggleSource, ready } = useFollowing();
  const following = isFollowingSource(sourceId);

  if (!ready) {
    return <span className="btn pointer-events-none opacity-50">☆ Follow</span>;
  }

  return (
    <button
      type="button"
      onClick={() => toggleSource(sourceId)}
      aria-pressed={following}
      title={`Follow all ${sourceName} stories`}
      className={`btn ${following ? "border-brand-500/60 bg-brand-500/15 text-brand-200" : ""}`}
    >
      <span aria-hidden>{following ? "★" : "☆"}</span>
      {following ? "Following" : "Follow"}
    </button>
  );
}

export function FollowCountBadge() {
  const { count, ready } = useFollowing();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted || !ready || count === 0) return null;

  return (
    <Link href="/following" className="chip border-brand-500/40 bg-brand-500/10 text-brand-200 transition-colors hover:bg-brand-500/20">
      ★ {count}
    </Link>
  );
}
