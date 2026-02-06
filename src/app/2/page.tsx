"use client";
import { useState } from "react";
import { Header } from "@/components/v2/Header";
import { CsvUpload } from "@/components/v2/CsvUpload";
import { ScoringForm } from "@/components/v2/ScoringForm";
import { Leaderboard } from "@/components/v2/Leaderboard";

export default function TerracottaPage() {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [scoringOpen, setScoringOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#faf6f1] dark:bg-[#1a1410]" style={{fontFamily: "'Palatino Linotype', Palatino, Georgia, serif"}}>
      <Header onOpenUpload={() => setUploadOpen(true)} onOpenScoring={() => setScoringOpen(true)} />
      <main className="mx-auto max-w-5xl px-6 py-8">
        <Leaderboard />
      </main>
      <CsvUpload isOpen={uploadOpen} onClose={() => setUploadOpen(false)} />
      <ScoringForm isOpen={scoringOpen} onClose={() => setScoringOpen(false)} />
    </div>
  );
}
