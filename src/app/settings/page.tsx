"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { CsvUpload } from "@/components/CsvUpload";
import { FootballCsvUpload } from "@/components/FootballCsvUpload";
import { Header } from "@/components/Header";
import { DraftSection } from "@/components/settings/DraftSection";
import { FootballRosterSection } from "@/components/settings/FootballRosterSection";
import { FootballScoringSection } from "@/components/settings/FootballScoringSection";
import { LeaguesSection } from "@/components/settings/LeaguesSection";
import { ProjectionsSection } from "@/components/settings/ProjectionsSection";
import { RosterSection } from "@/components/settings/RosterSection";
import { ScoringSection } from "@/components/settings/ScoringSection";
import { SettingsLayout } from "@/components/settings/SettingsLayout";
import { resolveSettingsSection } from "@/components/settings/types";
import { useStore } from "@/store";

function SettingsPageContent() {
  const [uploadOpen, setUploadOpen] = useState(false);
  const searchParams = useSearchParams();
  const activeSection = resolveSettingsSection(searchParams?.get("section"));
  const { leagues, activeLeagueId } = useStore();
  const activeLeague = leagues.find((l) => l.id === activeLeagueId) ?? leagues[0];
  const isFootball = activeLeague?.sport === "football";

  return (
    <div className="min-h-screen bg-[var(--color-surface-base)]">
      <Header activeSettingsSection={activeSection} />

      <main className="mx-auto max-w-5xl px-[var(--space-page-x)] py-5 font-sans sm:px-[var(--space-page-x-sm)] sm:py-8">
        <SettingsLayout activeSection={activeSection}>
          {activeSection === "projections" && (
            <ProjectionsSection onOpenUpload={() => setUploadOpen(true)} />
          )}
          {activeSection === "scoring" &&
            (isFootball ? <FootballScoringSection /> : <ScoringSection />)}
          {activeSection === "roster" &&
            (isFootball ? <FootballRosterSection /> : <RosterSection />)}
          {activeSection === "draft" && <DraftSection />}
          {activeSection === "leagues" && <LeaguesSection />}
        </SettingsLayout>
      </main>

      {isFootball ? (
        <FootballCsvUpload isOpen={uploadOpen} onClose={() => setUploadOpen(false)} />
      ) : (
        <CsvUpload isOpen={uploadOpen} onClose={() => setUploadOpen(false)} />
      )}
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
