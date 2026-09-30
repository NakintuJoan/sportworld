"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Clears the admin session cookie and returns to the sign-in page. */
export default function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await fetch("/api/admin/login", { method: "DELETE" });
          router.replace("/admin/login");
          router.refresh();
        } finally {
          setBusy(false);
        }
      }}
      className="btn disabled:opacity-60"
    >
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
