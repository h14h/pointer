"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { useStore } from "@/store";

// Legacy URL support: /settings?section=… predates the league workspace.
// Sections map onto the active league's Config/Intel tabs (leagues → home).
function SettingsRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { leagues, activeLeagueId, hasHydrated } = useStore();

  useEffect(() => {
    if (!hasHydrated) return;
    const league = leagues.find((l) => l.id === activeLeagueId) ?? leagues[0];
    if (!league) {
      router.replace("/");
      return;
    }
    const section = searchParams?.get("section");
    if (section === "leagues") {
      router.replace("/");
    } else if (section === "projections") {
      router.replace(`/league/${league.id}/intel`);
    } else {
      router.replace(`/league/${league.id}/config`);
    }
  }, [hasHydrated, leagues, activeLeagueId, searchParams, router]);

  return <div className="min-h-screen" />;
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <SettingsRedirect />
    </Suspense>
  );
}
