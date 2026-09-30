"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Admin sign-in form.
 *
 * The password is posted to the server and never stored in the browser. The
 * session itself is an httpOnly cookie set by the API route, so nothing
 * sensitive is reachable from JavaScript on the page.
 */
export default function LoginForm({ message }: { message?: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Could not sign in.");
        setBusy(false);
        return;
      }
      // Hard navigation so the server component re-reads the new cookie.
      router.replace("/admin");
      router.refresh();
    } catch {
      setError("Network error. Try again.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {message && !error && (
        <p className="rounded-lg border border-ink-700 bg-ink-900/60 px-3 py-2 text-xs text-slate-300">{message}</p>
      )}

      <div>
        <label htmlFor="password" className="mb-1.5 block text-xs font-semibold text-slate-300">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          autoFocus
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-white outline-none transition focus:border-brand-500"
        />
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-flame/40 bg-flame/5 px-3 py-2 text-xs text-flame">
          {error}
        </p>
      )}

      <button type="submit" disabled={busy} className="btn btn-primary w-full justify-center disabled:opacity-60">
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
