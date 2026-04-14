"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { CsvUpload } from "@/components/CsvUpload";
import { Header } from "@/components/Header";
import { DraftSection } from "@/components/settings/DraftSection";
import { LeaguesSection } from "@/components/settings/LeaguesSection";
import { ProjectionsSection } from "@/components/settings/ProjectionsSection";
import { RosterSection } from "@/components/settings/RosterSection";
import { ScoringSection } from "@/components/settings/ScoringSection";
import { SettingsLayout } from "@/components/settings/SettingsLayout";
import { resolveSettingsSection } from "@/components/settings/types";

function SettingsPageContent() {
  const [uploadOpen, setUploadOpen] = useState(false);
  const searchParams = useSearchParams();
  const activeSection = resolveSettingsSection(searchParams?.get("section"));

  return (
    <div className="min-h-screen bg-[var(--color-surface-base)]">
      <Header activeSettingsSection={activeSection} />

      <main className="mx-auto max-w-5xl px-[var(--space-page-x)] py-5 font-sans sm:px-[var(--space-page-x-sm)] sm:py-8">
        <SettingsLayout activeSection={activeSection}>
          {activeSection === "projections" && (
            <ProjectionsSection onOpenUpload={() => setUploadOpen(true)} />
          )}
          {activeSection === "scoring" && <ScoringSection />}
          {activeSection === "roster" && <RosterSection />}
          {activeSection === "draft" && <DraftSection />}
          {activeSection === "leagues" && <LeaguesSection />}
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
