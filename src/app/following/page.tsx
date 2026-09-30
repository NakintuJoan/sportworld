"use client";

import dynamic from "next/dynamic";

export default function FollowingRoute() {
  const FollowingPage = dynamic(() => import("@/components/FollowingPage"), {
    loading: () => <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6" />,
  });
  return <FollowingPage />;
}
