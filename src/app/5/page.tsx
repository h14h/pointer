"use client";

import { useState } from "react";
import { Header } from "@/components/v5/Header";
import { CsvUpload } from "@/components/v5/CsvUpload";
import { ScoringForm } from "@/components/v5/ScoringForm";
import { Leaderboard } from "@/components/v5/Leaderboard";

export default function AuroraPage() {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [scoringOpen, setScoringOpen] = useState(false);

  return (
    <div className="relative min-h-screen bg-[#f0f4f8] dark:bg-[#0a0e1a] font-sans text-[#1e293b] dark:text-[#cbd5e1]">
      {/* Aurora background effect */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-1/4 -left-1/4 h-[80vh] w-[80vh] rounded-full bg-teal-400/10 dark:bg-teal-400/5 blur-[120px]" />
        <div className="absolute top-1/3 -right-1/4 h-[70vh] w-[70vh] rounded-full bg-cyan-400/10 dark:bg-cyan-400/5 blur-[120px]" />
        <div className="absolute -bottom-1/4 left-1/3 h-[60vh] w-[60vh] rounded-full bg-purple-400/5 dark:bg-purple-400/3 blur-[120px]" />
      </div>

      <div className="relative z-10">
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
    </div>
  );
}
