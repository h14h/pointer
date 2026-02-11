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

      <main className="mx-auto max-w-5xl px-4 py-6 font-sans sm:px-6 sm:py-8">
        <div className="mb-8">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <h1
              className="text-2xl font-bold text-[#111111] dark:text-[#e5e5e5]"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            >
              Settings
            </h1>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-md border border-[#111111]/20 px-3.5 py-1.5 text-xs font-bold uppercase tracking-widest text-[#111111]/70 transition-colors hover:border-[#111111]/30 hover:text-[#111111] dark:border-[#e5e5e5]/20 dark:text-[#e5e5e5]/60 dark:hover:border-[#e5e5e5]/30 dark:hover:text-[#e5e5e5]"
            >
              <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
                <path fillRule="evenodd" d="M7.78 4.22a.75.75 0 0 1 0 1.06L5.06 8l2.72 2.72a.75.75 0 1 1-1.06 1.06L3.22 8.53a.75.75 0 0 1 0-1.06l3.5-3.5a.75.75 0 0 1 1.06 0ZM12.78 4.22a.75.75 0 0 1 0 1.06L10.06 8l2.72 2.72a.75.75 0 1 1-1.06 1.06l-3.5-3.5a.75.75 0 0 1 0-1.06l3.5-3.5a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
              </svg>
              Back to Board
            </Link>
          </div>
          <p className="mt-1 text-sm text-[#111111]/60 dark:text-[#e5e5e5]/50">
            Scoring, roster, and draft configuration.
          </p>
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
