"use client";

import { useState } from "react";
import { Header } from "@/components/v1/Header";
import { CsvUpload } from "@/components/v1/CsvUpload";
import { ScoringForm } from "@/components/v1/ScoringForm";
import { Leaderboard } from "@/components/v1/Leaderboard";

export default function ObsidianPage() {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [scoringOpen, setScoringOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-black font-mono">
      <Header
        onOpenUpload={() => setUploadOpen(true)}
        onOpenScoring={() => setScoringOpen(true)}
      />
      <main className="mx-auto max-w-7xl px-3 py-4">
        <Leaderboard />
      </main>
      <CsvUpload isOpen={uploadOpen} onClose={() => setUploadOpen(false)} />
      <ScoringForm isOpen={scoringOpen} onClose={() => setScoringOpen(false)} />
    </div>
  );
}
