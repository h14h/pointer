"use client";

import { Header } from "@/components/Header";
import { Leaderboard } from "@/components/Leaderboard";
import { PublicDatasetBootstrap } from "@/components/PublicDatasetBootstrap";

export default function Home() {
  return (
    <div className="min-h-screen bg-[var(--color-surface-base)] font-serif">
      <Header />

      <main className="py-6 sm:py-8">
        <PublicDatasetBootstrap />
        <Leaderboard />
      </main>
    </div>
  );
}
