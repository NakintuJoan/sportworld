"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "sportworld:following";

export type Following = {
  teams: string[];
  categories: string[];
  sources: string[];
};

const EMPTY: Following = { teams: [], categories: [], sources: [] };

type FollowContextValue = Following & {
  count: number;
  isFollowingTeam: (team: string) => boolean;
  toggleTeam: (team: string) => void;
  isFollowingCategory: (slug: string) => boolean;
  toggleCategory: (slug: string) => void;
  isFollowingSource: (id: string) => boolean;
  toggleSource: (id: string) => void;
  clear: () => void;
  ready: boolean;
};

const FollowContext = createContext<FollowContextValue | null>(null);

function normalise(value: Following): Following {
  return {
    teams: [...new Set(value.teams.map((t) => t.trim()).filter(Boolean))],
    categories: [...new Set(value.categories.filter(Boolean))],
    sources: [...new Set(value.sources.filter(Boolean))],
  };
}

function sameSet(a: string[], b: string): boolean {
  return a.some((item) => item.toLowerCase() === b.toLowerCase());
}

export function FollowProvider({ children }: { children: React.ReactNode }) {
  const [following, setFollowing] = useState<Following>(EMPTY);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Following>;
        setFollowing(normalise({ teams: parsed.teams ?? [], categories: parsed.categories ?? [], sources: parsed.sources ?? [] }));
      }
    } catch {
      // Corrupt or blocked storage: fall back to no follows.
    }
    setReady(true);
  }, []);

  const persist = useCallback((next: Following) => {
    setFollowing(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Storage full or blocked; state still works for the session.
    }
  }, []);

  const toggleIn = useCallback(
    (list: keyof Following, value: string) => {
      const current = following[list] as string[];
      const exists = list === "teams" ? sameSet(current, value) : current.includes(value);
      const next = exists ? current.filter((item) => (list === "teams" ? item.toLowerCase() !== value.toLowerCase() : item !== value)) : [...current, value];
      persist(normalise({ ...following, [list]: next }));
    },
    [following, persist]
  );

  const value = useMemo<FollowContextValue>(
    () => ({
      ...following,
      count: following.teams.length + following.categories.length + following.sources.length,
      isFollowingTeam: (team) => sameSet(following.teams, team),
      toggleTeam: (team) => toggleIn("teams", team),
      isFollowingCategory: (slug) => following.categories.includes(slug),
      toggleCategory: (slug) => toggleIn("categories", slug),
      isFollowingSource: (id) => following.sources.includes(id),
      toggleSource: (id) => toggleIn("sources", id),
      clear: () => persist(EMPTY),
      ready,
    }),
    [following, ready, toggleIn, persist]
  );

  return <FollowContext.Provider value={value}>{children}</FollowContext.Provider>;
}

export function useFollowing(): FollowContextValue {
  const context = useContext(FollowContext);
  if (!context) throw new Error("useFollowing must be used inside FollowProvider");
  return context;
}
