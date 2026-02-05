"use client";

import { useState } from "react";
import { Header } from "@/components/Header";
import { CsvUpload } from "@/components/CsvUpload";
import { ScoringForm } from "@/components/ScoringForm";
import { Leaderboard } from "@/components/Leaderboard";

export default function Home() {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [scoringOpen, setScoringOpen] = useState(false);

  return (
    <div className="min-h-screen bg-transparent">
      <Header
        onOpenUpload={() => setUploadOpen(true)}
        onOpenScoring={() => setScoringOpen(true)}
      />

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Leaderboard />
      </main>

      <CsvUpload isOpen={uploadOpen} onClose={() => setUploadOpen(false)} />
      <ScoringForm isOpen={scoringOpen} onClose={() => setScoringOpen(false)} />
    </div>
  );
}
