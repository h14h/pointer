"use client";

import { useState } from "react";
import { Header } from "@/components/v4/Header";
import { CsvUpload } from "@/components/v4/CsvUpload";
import { ScoringForm } from "@/components/v4/ScoringForm";
import { Leaderboard } from "@/components/v4/Leaderboard";

export default function InkPage() {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [scoringOpen, setScoringOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white dark:bg-[#111111] font-serif">
      <Header
        onOpenUpload={() => setUploadOpen(true)}
        onOpenScoring={() => setScoringOpen(true)}
      />
      <main className="mx-auto max-w-5xl px-6 py-8">
        <Leaderboard />
      </main>
      <CsvUpload isOpen={uploadOpen} onClose={() => setUploadOpen(false)} />
      <ScoringForm isOpen={scoringOpen} onClose={() => setScoringOpen(false)} />
    </div>
  );
}
