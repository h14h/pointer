"use client";
import { useState } from "react";
import { Header } from "@/components/v3/Header";
import { CsvUpload } from "@/components/v3/CsvUpload";
import { ScoringForm } from "@/components/v3/ScoringForm";
import { Leaderboard } from "@/components/v3/Leaderboard";

export default function ElectricPage() {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [scoringOpen, setScoringOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white dark:bg-[#0f0a1a] text-[#1e1e2e] dark:text-[#f0f0f0]">
      <Header onOpenUpload={() => setUploadOpen(true)} onOpenScoring={() => setScoringOpen(true)} />
      <main className="mx-auto max-w-7xl px-4 py-6">
        <Leaderboard />
      </main>
      <CsvUpload isOpen={uploadOpen} onClose={() => setUploadOpen(false)} />
      <ScoringForm isOpen={scoringOpen} onClose={() => setScoringOpen(false)} />
    </div>
  );
}
