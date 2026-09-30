"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { CATEGORIES } from "@/lib/categories";
import type { IngestReport, Source } from "@/lib/types";

type RunSummary = {
  totals: {
    feedsChecked: number;
    feedsHealthy: number;
    itemsParsed: number;
    inserted: number;
    updated: number;
    duplicates: number;
    pruned: number;
  };
  byCategory: Record<string, number>;
  sources: IngestReport["sources"];
  durationMs: number;
};

export function IngestButton() {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [summary, setSummary] = useState<RunSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setRunning(true);
    setError(null);
    try {
      const response = await fetch("/api/ingest", { cache: "no-store" });
      if (!response.ok) throw new Error(`Server responded ${response.status}`);
      setSummary((await response.json()) as RunSummary);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ingest failed");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-black text-white">Run collection now</h2>
          <p className="mt-1 text-xs text-slate-400">
            Fetches every enabled feed, removes duplicates, categorises and stores new stories. Safe to run repeatedly.
          </p>
        </div>
        <button type="button" onClick={() => void run()} disabled={running} className="btn btn-primary">
          <span aria-hidden className={running ? "animate-spin" : ""}>
            ⟳
          </span>
          {running ? "Collecting…" : "Run ingest"}
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-flame">{error}</p>}

      {summary && (
        <div className="mt-4 rounded-lg border border-ink-700 bg-ink-900/60 p-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="New stories" value={summary.totals.inserted} accent />
            <Stat label="Duplicates skipped" value={summary.totals.duplicates} />
            <Stat label="Items parsed" value={summary.totals.itemsParsed} />
            <Stat label="Feeds healthy" value={`${summary.totals.feedsHealthy}/${summary.totals.feedsChecked}`} />
          </div>

          {Object.keys(summary.byCategory).length > 0 && (
            <p className="mt-3 text-xs text-slate-400">
              Filed under:{" "}
              {Object.entries(summary.byCategory)
                .sort((a, b) => b[1] - a[1])
                .map(([category, count]) => `${category} (${count})`)
                .join(", ")}
            </p>
          )}

          {summary.sources.filter((s) => s.status === "error").length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-flame">Failing feeds</p>
              <ul className="mt-1.5 space-y-1 text-xs text-slate-400">
                {summary.sources
                  .filter((s) => s.status === "error")
                  .map((s) => (
                    <li key={s.id}>
                      <span className="text-slate-200">{s.name}</span> — {s.error}
                    </li>
                  ))}
              </ul>
            </div>
          )}

          <p className="mt-3 text-[11px] text-slate-500">Completed in {(summary.durationMs / 1000).toFixed(1)}s</p>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <div className="rounded-lg border border-ink-700 bg-ink-900/60 px-3 py-2">
      <p className={`font-display text-xl font-black ${accent ? "text-brand-400" : "text-white"}`}>{value}</p>
      <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
    </div>
  );
}

export function SourceManager() {
  const router = useRouter();
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    url: "",
    home: "",
    region: "Global",
    defaultCategory: "other",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/sources", { cache: "no-store" });
      const data = (await response.json()) as { sources: Source[] };
      setSources(data.sources);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load sources");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function mutate(request: Promise<Response>) {
    setError(null);
    try {
      const response = await request;
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Request failed (${response.status})`);
      }
      await load();
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Request failed");
    }
  }

  async function toggle(source: Source) {
    setBusyId(source.id);
    await mutate(
      fetch("/api/sources", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: source.id, enabled: !source.enabled }),
      })
    );
    setBusyId(null);
  }

  async function remove(source: Source) {
    if (!window.confirm(`Remove “${source.name}” and stop collecting it?`)) return;
    setBusyId(source.id);
    await mutate(fetch(`/api/sources?id=${encodeURIComponent(source.id)}`, { method: "DELETE" }));
    setBusyId(null);
  }

  async function add(event: React.FormEvent) {
    event.preventDefault();
    setBusyId("new");
    await mutate(
      fetch("/api/sources", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...form, home: form.home || form.url, enabled: true }),
      })
    );
    setBusyId(null);
    setForm({ name: "", url: "", home: "", region: "Global", defaultCategory: "other" });
    setShowAdd(false);
  }

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-black text-white">Sources</h2>
          <p className="mt-1 text-xs text-slate-400">
            {sources.filter((s) => s.enabled).length} of {sources.length} feeds enabled. Add any public RSS or Atom URL.
          </p>
        </div>
        <button type="button" onClick={() => setShowAdd((open) => !open)} className="btn">
          {showAdd ? "Cancel" : "+ Add source"}
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-flame">{error}</p>}

      {showAdd && (
        <form onSubmit={add} className="mt-4 grid gap-3 rounded-lg border border-ink-700 bg-ink-900/60 p-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="source-name">Name</label>
            <input
              id="source-name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Example Sports Weekly"
              className="input"
            />
          </div>
          <div>
            <label className="label" htmlFor="source-url">RSS / Atom URL</label>
            <input
              id="source-url"
              required
              type="url"
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              placeholder="https://example.com/feed.xml"
              className="input"
            />
          </div>
          <div>
            <label className="label" htmlFor="source-home">Website (optional)</label>
            <input
              id="source-home"
              type="url"
              value={form.home}
              onChange={(e) => setForm({ ...form, home: e.target.value })}
              placeholder="https://example.com"
              className="input"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="source-region">Region</label>
              <input
                id="source-region"
                value={form.region}
                onChange={(e) => setForm({ ...form, region: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label" htmlFor="source-category">Default sport</label>
              <select
                id="source-category"
                value={form.defaultCategory}
                onChange={(e) => setForm({ ...form, defaultCategory: e.target.value })}
                className="input"
              >
                {CATEGORIES.map((category) => (
                  <option key={category.slug} value={category.slug}>
                    {category.emoji} {category.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="sm:col-span-2">
            <button type="submit" disabled={busyId === "new"} className="btn btn-primary">
              {busyId === "new" ? "Saving…" : "Save source"}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="mt-4 space-y-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="skeleton h-12" />
          ))}
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="text-slate-500">
              <tr className="border-b border-ink-700">
                <th className="py-2 pr-3 font-semibold uppercase tracking-wider">Source</th>
                <th className="py-2 pr-3 font-semibold uppercase tracking-wider">Default</th>
                <th className="py-2 pr-3 font-semibold uppercase tracking-wider">Last run</th>
                <th className="py-2 pr-3 font-semibold uppercase tracking-wider">Items</th>
                <th className="py-2 pr-3 font-semibold uppercase tracking-wider">Status</th>
                <th className="py-2 font-semibold uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-800">
              {sources.map((source) => {
                const failing = source.consecutive_failures > 0;
                return (
                  <tr key={source.id} className={source.enabled ? "" : "opacity-50"}>
                    <td className="py-2.5 pr-3">
                      <span className="font-semibold text-slate-200">{source.name}</span>
                      <span className="block text-[11px] text-slate-500">{source.region}</span>
                    </td>
                    <td className="py-2.5 pr-3 text-slate-400">{source.default_category}</td>
                    <td className="py-2.5 pr-3 text-slate-400">
                      {source.last_fetched_at ? new Date(source.last_fetched_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "never"}
                    </td>
                    <td className="py-2.5 pr-3 text-slate-400">{source.last_item_count ?? "—"}</td>
                    <td className="py-2.5 pr-3">
                      {failing ? (
                        <span className="font-semibold text-flame" title={source.last_error ?? ""}>
                          ✕ {source.consecutive_failures}×
                        </span>
                      ) : source.last_status ? (
                        <span className="text-brand-400">✓ {source.last_status}</span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="py-2.5">
                      <div className="flex gap-1.5">
                        <button type="button" onClick={() => void toggle(source)} disabled={busyId === source.id} className="btn px-2 py-1 text-[11px]">
                          {source.enabled ? "Disable" : "Enable"}
                        </button>
                        <button
                          type="button"
                          onClick={() => void remove(source)}
                          disabled={busyId === source.id}
                          className="btn px-2 py-1 text-[11px] text-flame"
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
