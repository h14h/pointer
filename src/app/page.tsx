"use client";

import { useState } from "react";
import { Header } from "@/components/Header";
import { CsvUpload } from "@/components/CsvUpload";
import { Leaderboard } from "@/components/Leaderboard";

export default function Home() {
  const [uploadOpen, setUploadOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white dark:bg-[#111111] font-serif">
      <Header onOpenUpload={() => setUploadOpen(true)} />

      <main className="mx-auto max-w-5xl py-8">
        <Leaderboard />
      </main>

      <CsvUpload isOpen={uploadOpen} onClose={() => setUploadOpen(false)} />
    </div>
  );
}
