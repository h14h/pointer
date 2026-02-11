"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { CsvUpload } from "@/components/CsvUpload";
import { Header } from "@/components/Header";
import { DraftSection } from "@/components/settings/DraftSection";
import { RosterSection } from "@/components/settings/RosterSection";
import { ScoringSection } from "@/components/settings/ScoringSection";
import { SettingsLayout } from "@/components/settings/SettingsLayout";
import { resolveSettingsSection } from "@/components/settings/types";

function SettingsPageContent() {
  const [uploadOpen, setUploadOpen] = useState(false);
  const searchParams = useSearchParams();
  const activeSection = resolveSettingsSection(searchParams.get("section"));

  return (
    <div className="min-h-screen bg-white dark:bg-[#111111]">
      <Header onOpenUpload={() => setUploadOpen(true)} />

      <main className="mx-auto max-w-5xl px-6 py-8 font-sans">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-[#111111]/10 pb-5 dark:border-[#333333]">
          <div>
            <h1
              className="text-2xl font-bold text-[#111111] dark:text-[#e5e5e5]"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            >
              Settings
            </h1>
            <p className="mt-1 text-sm text-[#111111]/60 dark:text-[#e5e5e5]/50">
              Scoring, roster, and draft configuration with immediate updates.
            </p>
          </div>
          <Link
            href="/"
            className="rounded-sm border border-[#111111]/20 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-[#111111]/70 hover:bg-[#f5f5f5] hover:text-[#111111] dark:border-[#333333] dark:text-[#e5e5e5]/60 dark:hover:bg-[#1a1a1a] dark:hover:text-[#e5e5e5]"
          >
            Back to Board
          </Link>
        </div>

        <SettingsLayout activeSection={activeSection}>
          {activeSection === "scoring" && <ScoringSection />}
          {activeSection === "roster" && <RosterSection />}
          {activeSection === "draft" && <DraftSection />}
        </SettingsLayout>
      </main>

      <CsvUpload isOpen={uploadOpen} onClose={() => setUploadOpen(false)} />
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white dark:bg-[#111111] font-sans" />}>
      <SettingsPageContent />
    </Suspense>
  );
}
