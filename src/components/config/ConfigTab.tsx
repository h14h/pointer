"use client";

import { useRouter } from "next/navigation";
import { DraftSection } from "@/components/settings/DraftSection";
import { FootballRosterSection } from "@/components/settings/FootballRosterSection";
import { FootballScoringSection } from "@/components/settings/FootballScoringSection";
import { RosterSection } from "@/components/settings/RosterSection";
import { ScoringSection } from "@/components/settings/ScoringSection";
import { Button } from "@/components/ui/Button";
import { Dropdown } from "@/components/ui/Dropdown";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/Panel";
import { useRouteLeague } from "@/store/selectors";
import { useStore } from "@/store";

function SectionStamp({ children }: { children: React.ReactNode }) {
  return <h2 className="stamp mb-3 mt-10 first:mt-0">{children}</h2>;
}

/**
 * The Config tab: everything that defines this league — identity (name, your
 * team), scoring, roster shape, draft order & keepers, and the danger zone.
 * Scoring/roster/draft forms are the proven settings sections, remounted.
 */
export function ConfigTab() {
  const router = useRouter();
  const league = useRouteLeague();
  const { leagues, renameLeague, setMyTeamIndex, duplicateLeague, deleteLeague } = useStore();

  if (!league) return null;
  const isFootball = league.sport === "football";

  return (
    <div className="max-w-4xl">
      <SectionStamp>League identity</SectionStamp>
      <Panel padding="none">
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-end">
          <label className="flex flex-1 flex-col gap-1">
            <span className="stamp">League name</span>
            <Input
              defaultValue={league.name}
              onBlur={(e) => renameLeague(league.id, e.target.value)}
            />
          </label>
          <div className="flex flex-1 flex-col gap-1">
            <span className="stamp">Your team</span>
            <Dropdown
              value={String(league.myTeamIndex ?? 0)}
              onChange={(next) => setMyTeamIndex(Number(next))}
              ariaLabel="Your team"
              triggerClassName="h-9 w-full rounded-sm"
              options={league.leagueSettings.teamNames.map((name, i) => ({
                value: String(i),
                label: name,
              }))}
            />
          </div>
        </div>
        <p className="px-4 pb-4 text-xs text-[var(--color-fg-muted)]">
          &ldquo;Your team&rdquo; drives the Plan tab&apos;s pick timeline and the
          draft room&apos;s on-the-clock highlights.
        </p>
      </Panel>

      <SectionStamp>Scoring</SectionStamp>
      {isFootball ? <FootballScoringSection /> : <ScoringSection />}

      <SectionStamp>Roster</SectionStamp>
      {isFootball ? <FootballRosterSection /> : <RosterSection />}

      <SectionStamp>Draft order &amp; keepers</SectionStamp>
      <DraftSection />

      <SectionStamp>Danger zone</SectionStamp>
      <Panel tone="danger" padding="none">
        <div className="flex flex-wrap items-center gap-3 p-4">
          <Button variant="secondary" onClick={() => duplicateLeague(league.id)}>
            Duplicate league
          </Button>
          <Button
            variant="destructive"
            disabled={leagues.length <= 1}
            onClick={() => {
              if (window.confirm(`Delete “${league.name}”? This cannot be undone.`)) {
                deleteLeague(league.id);
                router.push("/");
              }
            }}
          >
            Delete league
          </Button>
        </div>
      </Panel>
    </div>
  );
}
