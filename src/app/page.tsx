"use client";

import { FootballLeaderboard } from "@/components/FootballLeaderboard";
import { Header } from "@/components/Header";
import { Leaderboard } from "@/components/Leaderboard";
import { PublicDatasetBootstrap } from "@/components/PublicDatasetBootstrap";
import { Welcome } from "@/components/Welcome";
import { useStore } from "@/store";

export default function Home() {
  const { leagues, activeLeagueId, hasHydrated, hasOnboarded } = useStore();
  const activeLeague = leagues.find((l) => l.id === activeLeagueId) ?? leagues[0];
  const isFootball = activeLeague?.sport === "football";

  // Wait for IndexedDB hydration before choosing a view so first-time
  // visitors see the welcome screen and returning users skip it cleanly.
  if (!hasHydrated) {
    return <div className="min-h-screen bg-[var(--color-surface-base)]" />;
  }

  if (!hasOnboarded) {
    return <Welcome />;
  }

  return (
    <div className="min-h-screen bg-[var(--color-surface-base)] font-serif">
      <Header />

      <main className="py-6 sm:py-8">
        <PublicDatasetBootstrap />
        {isFootball ? <FootballLeaderboard /> : <Leaderboard />}
      </main>
    </div>
  );
}
