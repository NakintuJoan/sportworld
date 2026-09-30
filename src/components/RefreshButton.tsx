"use client";

import { useRouter } from "next/navigation";

export default function RefreshButton() {
  const router = useRouter();
  return (
    <button type="button" onClick={() => router.refresh()} className="btn">
      <span aria-hidden>⟳</span> Refresh data
    </button>
  );
}
