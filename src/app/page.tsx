"use client";

import { FootballLeaderboard } from "@/components/FootballLeaderboard";
import { Header } from "@/components/Header";
import { Leaderboard } from "@/components/Leaderboard";
import { PublicDatasetBootstrap } from "@/components/PublicDatasetBootstrap";
import { useStore } from "@/store";

export default function Home() {
  const { leagues, activeLeagueId } = useStore();
  const activeLeague = leagues.find((l) => l.id === activeLeagueId) ?? leagues[0];
  const isFootball = activeLeague?.sport === "football";

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
