import type { League, ProjectionGroup } from "@/types";

/**
 * One prep check on a league card's readiness bar.
 *
 * To add a check, append another `{ label, done }` entry in `leagueReadiness`
 * below — the bar, percentage, and "n of m prepped" stamp all derive from the
 * array, so nothing else needs to change.
 */
export interface ReadinessCheck {
  label: string;
  done: boolean;
}

const DEFAULT_TEAM_NAME = /^Team \d+$/;

/** Total roster slots (starters + bench) for the league's sport. */
function totalRosterSlots(league: League): number {
  const roster: { positions: Record<string, number>; bench: number } =
    league.sport === "football" && league.football
      ? league.football.roster
      : league.leagueSettings.roster;
  const starters = Object.values(roster.positions ?? {}).reduce(
    (sum, count) => sum + (count ?? 0),
    0
  );
  return starters + (roster.bench ?? 0);
}

/** Any team renamed away from the "Team N" default, or a draft slot chosen. */
function teamsTouched(league: League): boolean {
  const renamed = league.leagueSettings.teamNames.some(
    (name) => !DEFAULT_TEAM_NAME.test(name)
  );
  const slotChosen = (league.myTeamIndex ?? 0) !== 0;
  return renamed || slotChosen;
}

/** At least one target flagged or one round note written on the Plan tab. */
function strategyStarted(league: League): boolean {
  const targets = league.strategy?.targetIds?.length ?? 0;
  if (targets > 0) return true;
  return Object.values(league.strategy?.noteByRound ?? {}).some(
    (note) => note.trim().length > 0
  );
}

/**
 * Deterministic prep checks behind a league card's readiness bar.
 * `group` is the league's resolved projection source (or null when none).
 */
export function leagueReadiness(
  league: League,
  group: ProjectionGroup | null
): ReadinessCheck[] {
  return [
    { label: "projection source", done: group !== null },
    { label: "roster shape", done: totalRosterSlots(league) > 0 },
    { label: "teams & draft order", done: teamsTouched(league) },
    { label: "strategy", done: strategyStarted(league) },
  ];
}
