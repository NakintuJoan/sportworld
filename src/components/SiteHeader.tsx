"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useRef, useState, useTransition } from "react";

import { FollowCountBadge } from "./FollowButtons";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/following", label: "My Sport" },
  { href: "/latest", label: "Latest" },
  { href: "/transfers", label: "Transfers" },
  { href: "/scores", label: "Scores" },
  { href: "/admin", label: "Admin" },
];

export default function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [menuOpen, setMenuOpen] = useState(false);
  const [refreshing, startRefresh] = useTransition();
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // "/" focuses search, the way a news site should behave.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "/" || menuOpen) return;
      const target = event.target as HTMLElement | null;
      const typing = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
      if (typing) return;
      event.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  function onSearch(event: FormEvent) {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className="sticky top-0 z-50 border-b border-ink-800 bg-ink-950/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-3 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="SportWorld home">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-pitch text-lg font-black text-ink-950" aria-hidden>
            SW
          </span>
          <span className="hidden flex-col leading-none sm:flex">
            <span className="font-display text-lg font-black tracking-tight text-white">SportWorld</span>
            <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">All Sports. One Place.</span>
          </span>
        </Link>

        <nav className="ml-2 hidden items-center gap-0.5 lg:flex" aria-label="Main">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={`rounded-md px-2.5 py-1.5 text-[13px] font-semibold transition-colors ${
                isActive(item.href) ? "bg-ink-800 text-white" : "text-slate-400 hover:bg-ink-850 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <form onSubmit={onSearch} role="search" className="ml-auto flex min-w-0 flex-1 items-center gap-2 sm:max-w-xs">
          <div className="relative w-full">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden>
              🔍
            </span>
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search teams, players, stories…"
              aria-label="Search sports news"
              className="input pl-9"
            />
          </div>
        </form>

        <FollowCountBadge />

        <button
          type="button"
          onClick={() => startRefresh(() => router.refresh())}
          disabled={refreshing}
          className="btn hidden shrink-0 sm:inline-flex"
          title="Refresh the latest stories"
        >
          <span aria-hidden className={refreshing ? "animate-spin" : ""}>
            ⟳
          </span>
          {refreshing ? "Loading" : "Refresh"}
        </button>

        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-controls="mobile-nav"
          className="btn shrink-0 lg:hidden"
        >
          <span aria-hidden>{menuOpen ? "✕" : "☰"}</span>
          <span className="sr-only">Menu</span>
        </button>
      </div>

      {menuOpen && (
        <nav id="mobile-nav" aria-label="Main" className="border-t border-ink-800 bg-ink-900/95 lg:hidden">
          <div className="mx-auto grid max-w-[1400px] grid-cols-2 gap-1 px-4 py-3 sm:px-6">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={`rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
                  isActive(item.href) ? "bg-ink-800 text-white" : "text-slate-300 hover:bg-ink-800"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
