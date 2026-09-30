import type { Metadata, Viewport } from "next";
import { Suspense } from "react";

import SiteHeader from "@/components/SiteHeader";
import { FollowProvider } from "@/components/FollowProvider";
import { CATEGORIES } from "@/lib/categories";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "SportWorld — All Sports. One Place.",
    template: "%s | SportWorld",
  },
  description:
    "Live sports news aggregator covering football, cricket, basketball, tennis, Formula 1, rugby, boxing, athletics and more. Headlines and summaries from BBC Sport, Sky Sports, The Guardian, ESPNcricinfo, CBS Sports and more, updated automatically.",
  keywords: [
    "sports news",
    "football news",
    "cricket news",
    "basketball news",
    "tennis news",
    "formula 1 news",
    "sports headlines",
    "breaking sports news",
  ],
  openGraph: {
    type: "website",
    siteName: "SportWorld",
    title: "SportWorld — All Sports. One Place.",
    description: "Every game. Every story. Everywhere. Automatic sports news from the world's best sources.",
  },
  twitter: {
    card: "summary_large_image",
    title: "SportWorld — All Sports. One Place.",
    description: "Every game. Every story. Everywhere.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#07090f",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const categoryLinks = CATEGORIES.map((category) => ({
    url: `/category/${category.slug}`,
    label: category.label,
  }));

  return (
    <html lang="en" className="dark">
      <body className="min-h-screen">
        <FollowProvider>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-brand-600 focus:px-4 focus:py-2 focus:font-semibold focus:text-ink-950"
          >
            Skip to content
          </a>
          <Suspense fallback={<div className="h-[61px] border-b border-ink-800 bg-ink-950" />}>
            <SiteHeader />
          </Suspense>
          <main id="main">{children}</main>
          <footer className="mt-16 border-t border-ink-800 bg-ink-900/50">
            <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
              <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
                <div className="max-w-sm">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-pitch text-sm font-black text-ink-950" aria-hidden>
                      SW
                    </span>
                    <span className="font-display text-base font-black text-white">SportWorld</span>
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-slate-400">
                    All Sports. One Place. SportWorld collects public RSS feeds and headlines automatically. Every
                    story links back to the original publisher, who holds the copyright.
                  </p>
                </div>

                <nav aria-label="Footer categories" className="grid grid-cols-2 gap-x-8 gap-y-2 sm:max-w-lg sm:grid-cols-3">
                  {categoryLinks.map((link) => (
                    <a
                      key={link.url}
                      href={link.url}
                      className="text-xs text-slate-400 transition-colors hover:text-brand-300"
                    >
                      {link.label}
                    </a>
                  ))}
                </nav>
              </div>

              <div className="mt-8 flex flex-col gap-3 border-t border-ink-800 pt-6 text-[11px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                <p>
                  Headlines and short excerpts only. Full articles stay with{" "}
                  <a href="https://www.bbc.com/sport" className="text-slate-400 underline-offset-2 hover:underline" target="_blank" rel="noopener noreferrer">
                    the publishers
                  </a>
                  .
                </p>
                <p className="flex items-center gap-4">
                  <a href="/admin" className="transition-colors hover:text-brand-300">
                    Admin
                  </a>
                  <a href="/latest" className="transition-colors hover:text-brand-300">
                    Latest
                  </a>
                  <a href="/transfers" className="transition-colors hover:text-brand-300">
                    Transfers
                  </a>
                </p>
              </div>
            </div>
          </footer>
        </FollowProvider>
      </body>
    </html>
  );
}
