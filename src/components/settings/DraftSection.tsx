"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { NumericInput } from "@/components/NumericInput";
import { DraftTeamRow, type DraftKeeperEntry } from "@/components/settings/DraftTeamRow";
import { normalizeLeagueSettingsDraft } from "@/components/settings/constants";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { Panel } from "@/components/ui/Panel";
import { calculateFootballPoints, normalizeFootballConfig } from "@/lib/football";
import { calculatePlayerPoints } from "@/lib/scoring";
import {
  canEditDraftSetup,
  findNextAvailableKeeperRound,
  getDraftPickContext,
  getPickIndexForTeamRound,
} from "@/lib/draft";
import { matchesPlayerSearch } from "@/lib/leaderboard";
import { resolveProjectionGroupForLeague } from "@/lib/projections";
import { useStore } from "@/store";
import type { League, LeagueSettings, ProjectionGroup, Sport } from "@/types";
import type { KeeperPlayer } from "@/components/settings/DraftTeamRow";

function getActiveGroup(
  projectionGroups: ProjectionGroup[],
  league: League | undefined,
  sport: Sport
) {
  if (league) return resolveProjectionGroupForLeague(league, projectionGroups);
  const sportGroups = projectionGroups.filter(
    (group) => (group.sport ?? "baseball") === sport
  );
  return sportGroups[0] ?? null;
}

function getAllPlayers(activeGroup: ProjectionGroup | null): KeeperPlayer[] {
  if (!activeGroup) return [];
  if (activeGroup.sport === "football") return [...(activeGroup.footballPlayers ?? [])];
  return [...activeGroup.batters, ...activeGroup.pitchers, ...activeGroup.twoWayPlayers];
}

function getTeamRosterSize(league: League, leagueSettings: LeagueSettings) {
  if (league.sport === "football") {
    const roster = normalizeFootballConfig(league.football).roster;
    return (
      Object.values(roster.positions).reduce((total, value) => total + value, 0) + roster.bench
    );
  }
  return (
    Object.values(leagueSettings.roster.positions).reduce((total, value) => total + value, 0) +
    leagueSettings.roster.bench
  );
}

function formatCollapsedKeeperName(name: string) {
  const trimmed = name.trim();
  if (trimmed.length === 0) return trimmed;
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0];
  const [firstName, ...rest] = parts;
  return `${firstName[0]}. ${rest.join(" ")}`;
}

function getExpandedIndexAfterMove(current: number | null, from: number, to: number) {
  if (current === null) return null;
  if (current === from) return to;
  if (from < to && current > from && current <= to) return current - 1;
  if (from > to && current >= to && current < from) return current + 1;
  return current;
}

export function DraftSection() {
  const {
    leagues,
    activeLeagueId,
    updateLeague,
    projectionGroups,
    setKeeper,
    removeKeeper,
    setMyTeamIndex,
  } = useStore();
  const activeLeague = leagues.find((l) => l.id === activeLeagueId) ?? leagues[0];
  const leagueSettings = activeLeague?.leagueSettings;
  const draftState = activeLeague?.draftState;
  const activeSport: Sport = activeLeague?.sport === "football" ? "football" : "baseball";
  // No manual useMemo here — the React Compiler memoizes these derivations
  // itself (and its lint rule rejects manual memoization it can't preserve).
  const activeGroup = getActiveGroup(projectionGroups, activeLeague, activeSport);
  const allPlayers = getAllPlayers(activeGroup);
  const keeperSlotByPlayer = draftState?.keeperSlotByPlayer ?? {};
  const hasInProgressDraft =
    Object.keys(draftState?.draftedByTeam ?? {}).filter(
      (playerId) => draftState?.keeperByTeam?.[playerId] === undefined
    ).length > 0;
  const setupUnlocked = draftState ? canEditDraftSetup(draftState) : true;

  const teamNameDraftByIndexRef = useRef<Record<number, string>>({});
  const [keeperSearchByTeam, setKeeperSearchByTeam] = useState<Record<number, string>>({});
  const [keeperRoundDraftByPlayer, setKeeperRoundDraftByPlayer] = useState<Record<string, string>>({});
  const [expandedTeamIndex, setExpandedTeamIndex] = useState<number | null>(null);
  const frozenKeeperOrderByTeamRef = useRef<Record<number, string[]>>({});

  const keeperEntries = Object.entries(draftState.keeperByTeam)
    .map(([playerId, teamIndex]) => ({
      player: allPlayers.find((candidate) => candidate._id === playerId) ?? null,
      playerId,
      teamIndex: Number(teamIndex),
      slotIndex: keeperSlotByPlayer[playerId] ?? null,
    }))
    .filter((entry): entry is DraftKeeperEntry => entry.player !== null);

  const commitLeagueSettings = (nextNames: string[]) => {
    const next = normalizeLeagueSettingsDraft({
      ...leagueSettings,
      teamNames: nextNames,
      leagueSize: nextNames.length,
    });
    updateLeague({ leagueSettings: next });
  };

  const maxKeeperRound = getTeamRosterSize(activeLeague, leagueSettings);

  const getNextAvailableKeeperRound = (teamIndex: number) => {
    let round = 1;
    while (round <= maxKeeperRound) {
      const pickIndex = getPickIndexForTeamRound(
        leagueSettings.leagueSize,
        round,
        teamIndex,
        draftState.format
      );
      const isReserved = Object.entries(keeperSlotByPlayer).some(
        ([playerId, slotIndex]) =>
          draftState.keeperByTeam[playerId] !== undefined && slotIndex === pickIndex
      );
      if (pickIndex !== null && !isReserved && pickIndex >= draftState.pickIndex) {
        return round;
      }
      round += 1;
    }
    return 1;
  };

  const getKeeperRoundValue = (entry: { teamIndex: number; slotIndex: number | null }) => {
    if (entry.slotIndex === null) return getNextAvailableKeeperRound(entry.teamIndex);
    return getDraftPickContext(leagueSettings.leagueSize, entry.slotIndex, draftState.format).round;
  };

  const getTeamKeepers = (teamIndex: number) =>
    keeperEntries.filter((entry) => entry.teamIndex === teamIndex);

  const getSortedTeamKeepers = (teamIndex: number) =>
    getTeamKeepers(teamIndex).sort(
      (left, right) => getKeeperRoundValue(left) - getKeeperRoundValue(right),
    );

  const snapshotKeeperOrder = (teamIndex: number) => {
    const existing = frozenKeeperOrderByTeamRef.current[teamIndex];
    if (existing && existing.length > 0) return existing;
    const ids = getTeamKeepers(teamIndex).map((entry) => entry.playerId);
    frozenKeeperOrderByTeamRef.current = {
      ...frozenKeeperOrderByTeamRef.current,
      [teamIndex]: ids,
    };
    return ids;
  };

  const applyFrozenKeeperOrder = (teamIndex: number) => {
    const entries = getTeamKeepers(teamIndex);
    const frozen = snapshotKeeperOrder(teamIndex);
    const byId = new Map(entries.map((entry) => [entry.playerId, entry]));
    const ordered: DraftKeeperEntry[] = [];
    for (const playerId of frozen) {
      const entry = byId.get(playerId);
      if (entry) ordered.push(entry);
    }
    const seen = new Set(frozen);
    for (const entry of entries) {
      if (!seen.has(entry.playerId)) ordered.push(entry);
    }
    const nextIds = ordered.map((entry) => entry.playerId);
    frozenKeeperOrderByTeamRef.current[teamIndex] = nextIds;
    return ordered;
  };

  const resetKeeperRoundDraft = (playerId: string) => {
    setKeeperRoundDraftByPlayer((current) => {
      const next = { ...current };
      delete next[playerId];
      return next;
    });
  };

  const rejectKeeperRoundChange = (playerId: string, message: string) => {
    resetKeeperRoundDraft(playerId);
    toast(message);
  };

  const isRoundPassed = (teamIndex: number, round: number) => {
    const pickIndex = getPickIndexForTeamRound(
      leagueSettings.leagueSize,
      round,
      teamIndex,
      draftState.format
    );
    return pickIndex === null || pickIndex < draftState.pickIndex;
  };

  const handleCommitKeeperRound = (teamIndex: number, playerId: string, requestedRound: number) => {
    if (!Number.isFinite(requestedRound)) {
      rejectKeeperRoundChange(playerId, `Keeper rounds must be between 1 and ${maxKeeperRound}`);
      return;
    }

    const normalizedRound = Math.round(requestedRound);
    const teamKeepers = getSortedTeamKeepers(teamIndex);
    const editedEntry = teamKeepers.find((entry) => entry.playerId === playerId);
    if (!editedEntry) return;

    if (normalizedRound < 1 || normalizedRound > maxKeeperRound) {
      rejectKeeperRoundChange(playerId, `Keeper rounds must be between 1 and ${maxKeeperRound}`);
      return;
    }

    const currentRound = getKeeperRoundValue(editedEntry);
    if (normalizedRound === currentRound) {
      resetKeeperRoundDraft(playerId);
      return;
    }

    const occupiedByOtherKeeper = teamKeepers.some(
      (entry) => entry.playerId !== playerId && getKeeperRoundValue(entry) === normalizedRound
    );
    if (occupiedByOtherKeeper) {
      rejectKeeperRoundChange(playerId, `Round ${normalizedRound} is already occupied`);
      return;
    }

    if (isRoundPassed(teamIndex, normalizedRound)) {
      rejectKeeperRoundChange(playerId, "That keeper slot has already passed");
      return;
    }

    setKeeper(playerId, teamIndex, normalizedRound);
    resetKeeperRoundDraft(playerId);
  };

  const getMoveTargetRound = (
    teamIndex: number,
    playerId: string,
    direction: "earlier" | "later"
  ) => {
    const teamKeepers = getSortedTeamKeepers(teamIndex);
    const entry = teamKeepers.find((candidate) => candidate.playerId === playerId);
    if (!entry) return null;
    const currentRound = getKeeperRoundValue(entry);
    const occupiedRounds = teamKeepers
      .filter((candidate) => candidate.playerId !== playerId)
      .map((candidate) => getKeeperRoundValue(candidate));

    return findNextAvailableKeeperRound({
      leagueSize: leagueSettings.leagueSize,
      currentRound,
      teamIndex,
      direction,
      occupiedRounds,
      maxRound: maxKeeperRound,
      pickIndex: draftState.pickIndex,
      format: draftState.format,
    });
  };

  const handleMoveKeeperRound = (
    teamIndex: number,
    playerId: string,
    direction: "earlier" | "later"
  ) => {
    const targetRound = getMoveTargetRound(teamIndex, playerId, direction);
    if (targetRound === null) {
      const currentEntry = getSortedTeamKeepers(teamIndex).find((entry) => entry.playerId === playerId);
      if (!currentEntry) return;
      const currentRound = getKeeperRoundValue(currentEntry);
      const hitBoundary =
        (direction === "earlier" && currentRound <= 1) ||
        (direction === "later" && currentRound >= maxKeeperRound);
      if (hitBoundary) return;
      toast("That keeper slot has already passed");
      return;
    }
    setKeeper(playerId, teamIndex, targetRound);
    resetKeeperRoundDraft(playerId);
  };

  const getKeeperCostLabel = (teamIndex: number, round: number | null) => {
    if (round === null) return "No slot assigned";
    const pickIndex = getPickIndexForTeamRound(
      leagueSettings.leagueSize,
      round,
      teamIndex,
      draftState.format
    );
    if (pickIndex === null) return "Invalid slot";
    const context = getDraftPickContext(leagueSettings.leagueSize, pickIndex, draftState.format);
    return `Pick ${context.overallPick}`;
  };

  const footballConfig =
    activeLeague?.sport === "football" ? normalizeFootballConfig(activeLeague.football) : null;

  const getCandidatePoints = (player: KeeperPlayer) =>
    player._type === "football"
      ? calculateFootballPoints(player, (footballConfig ?? normalizeFootballConfig(undefined)).scoring)
      : calculatePlayerPoints(player, activeLeague.scoringSettings);

  const getKeeperCandidatesForTeam = (teamIndex: number) => {
    const search = keeperSearchByTeam[teamIndex] ?? "";
    if (search.trim().length === 0) return [];
    return allPlayers
      .filter((player) => draftState.draftedByTeam[player._id] === undefined)
      .filter((player) => draftState.keeperByTeam[player._id] === undefined)
      .filter((player) => matchesPlayerSearch(player, search))
      .sort((left, right) => {
        const pointDelta = getCandidatePoints(right) - getCandidatePoints(left);
        if (pointDelta !== 0) return pointDelta;
        return left.Name.localeCompare(right.Name);
      })
      .slice(0, 6);
  };

  const handleLeagueSizeCommit = (value: number) => {
    if (!setupUnlocked) return;
    const clampedSize = Math.min(20, Math.max(2, Math.round(value || 0)));
    const nextNames = [...leagueSettings.teamNames];
    if (nextNames.length < clampedSize) {
      for (let index = nextNames.length; index < clampedSize; index += 1) {
        nextNames.push(`Team ${index + 1}`);
      }
    } else if (nextNames.length > clampedSize) {
      nextNames.length = clampedSize;
      setExpandedTeamIndex((current) => {
        if (current === null || current < clampedSize) return current;
        return clampedSize - 1;
      });
    }
    commitLeagueSettings(nextNames);
  };

  // "Your team" (league.myTeamIndex) is a POSITION in the draft order — any
  // structural change to teamNames must remap it or the Plan timeline and the
  // draft room silently track whichever team landed in the old slot.
  const myTeamIndex = activeLeague?.myTeamIndex ?? 0;

  const handleAddTeamBelow = (index: number) => {
    if (!setupUnlocked || leagueSettings.teamNames.length >= 20) return;
    const nextNames = [...leagueSettings.teamNames];
    nextNames.splice(index + 1, 0, `Team ${nextNames.length + 1}`);
    commitLeagueSettings(nextNames);
    if (myTeamIndex >= index + 1) setMyTeamIndex(myTeamIndex + 1);
    setExpandedTeamIndex(index + 1);
  };

  const handleRemoveTeamAt = (index: number) => {
    if (!setupUnlocked || leagueSettings.teamNames.length <= 2) return;
    const nextNames = leagueSettings.teamNames.filter((_, teamIndex) => teamIndex !== index);
    commitLeagueSettings(nextNames);
    if (myTeamIndex === index) setMyTeamIndex(Math.max(0, index - 1));
    else if (myTeamIndex > index) setMyTeamIndex(myTeamIndex - 1);
    setExpandedTeamIndex((current) => {
      if (current === null) return null;
      if (current === index) return Math.max(0, index - 1);
      if (current > index) return current - 1;
      return current;
    });
  };

  const handleMoveTeamToIndex = (from: number, to: number) => {
    if (!setupUnlocked || from === to) return;
    const nextNames = [...leagueSettings.teamNames];
    const [moved] = nextNames.splice(from, 1);
    nextNames.splice(to, 0, moved);
    commitLeagueSettings(nextNames);
    const nextMyTeamIndex = getExpandedIndexAfterMove(myTeamIndex, from, to);
    if (nextMyTeamIndex !== null && nextMyTeamIndex !== myTeamIndex) {
      setMyTeamIndex(nextMyTeamIndex);
    }
    setExpandedTeamIndex((current) => getExpandedIndexAfterMove(current, from, to));
  };

  const finalizeTeamName = (index: number, value: string) => {
    const nextNames = [...leagueSettings.teamNames];
    nextNames[index] = value.trim().length > 0 ? value.trim() : `Team ${index + 1}`;
    commitLeagueSettings(nextNames);
  };

  return (
    <div className="font-sans">
      {!setupUnlocked ? (
        <Panel
          tone="warning"
          padding="md"
          className="mb-5 flex flex-wrap items-center justify-between gap-3 text-sm text-[var(--color-fg-default)]"
        >
          <p className="max-w-[64ch]">
            Team order, add/remove, and league size are locked because draft activity already exists.
            Reorder controls are disabled, but team names and keeper assignments can still be edited.
          </p>
          {hasInProgressDraft ? (
            <p className="stamp">to start over, reset the draft from the draft room</p>
          ) : null}
        </Panel>
      ) : null}

      <Panel as="section" padding="none">
        {/* League size row */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--color-border-soft)] px-4 py-3 sm:px-5">
          <div>
            <FieldLabel className="block">League Size</FieldLabel>
            <p className="mt-1 text-xs text-[var(--color-fg-subtle)]">
              Structural team changes lock once draft activity begins.
            </p>
          </div>
          <NumericInput
            aria-label="League size"
            units="teams"
            unitsClassName="stamp"
            increment={1}
            min={2}
            max={20}
            value={leagueSettings.leagueSize}
            onCommit={handleLeagueSizeCommit}
            inputClassName="font-data w-14"
            disabled={!setupUnlocked}
          />
        </div>

        {/* Draft order header rule */}
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-[var(--color-border-soft)] px-4 py-2.5 sm:px-5">
          <span className="stamp">
            Draft Order ({leagueSettings.teamNames.length})
          </span>
          <span className="text-[11px] text-[var(--color-fg-subtle)]">
            {setupUnlocked
              ? "Use move-to-position controls for quick reordering"
              : "Reorder controls locked, keeper edits still available"}
          </span>
        </div>

        {/* Team ledger */}
        {leagueSettings.teamNames.map((name, index) => {
          const sortedKeepers = getSortedTeamKeepers(index);
          const teamKeepers =
            expandedTeamIndex === index ? applyFrozenKeeperOrder(index) : sortedKeepers;
          const keeperCandidates = expandedTeamIndex === index ? getKeeperCandidatesForTeam(index) : [];
          const keeperSearch = keeperSearchByTeam[index] ?? "";

          return (
            <DraftTeamRow
              key={`team-${index}-${name}`}
              index={index}
              name={name}
              leagueSize={leagueSettings.leagueSize}
              isExpanded={expandedTeamIndex === index}
              setupUnlocked={setupUnlocked}
              teamKeepers={teamKeepers}
              collapsedKeeperBadges={sortedKeepers.map((entry) => ({
                playerId: entry.playerId,
                label: `${formatCollapsedKeeperName(entry.player?.Name ?? entry.playerId)} • R${getKeeperRoundValue(entry)}`,
              }))}
              maxTeamsReached={leagueSettings.teamNames.length >= 20}
              minTeamsReached={leagueSettings.teamNames.length <= 2}
              teamNameDraftByIndexRef={teamNameDraftByIndexRef}
              keeperSearch={keeperSearch}
              keeperCandidates={keeperCandidates}
              hasActiveProjectionGroup={activeGroup !== null}
              keeperRoundDraftByPlayer={keeperRoundDraftByPlayer}
              onToggleExpanded={() => {
                setExpandedTeamIndex((current) => {
                  if (current === index) return null;
                  snapshotKeeperOrder(index);
                  return index;
                });
              }}
              onReorder={(nextPosition) => handleMoveTeamToIndex(index, nextPosition)}
              onAddTeamBelow={() => handleAddTeamBelow(index)}
              onRemoveTeam={() => handleRemoveTeamAt(index)}
              onFinalizeTeamName={(value) => finalizeTeamName(index, value)}
              onKeeperSearchChange={(value) =>
                setKeeperSearchByTeam((current) => ({
                  ...current,
                  [index]: value,
                }))
              }
              onAssignKeeper={(playerId) => {
                setKeeper(playerId, index, getNextAvailableKeeperRound(index));
                setKeeperSearchByTeam((current) => ({
                  ...current,
                  [index]: "",
                }));
              }}
              onRemoveKeeper={removeKeeper}
              onCommitKeeperRound={handleCommitKeeperRound}
              onKeeperRoundDraftChange={(playerId, value) =>
                setKeeperRoundDraftByPlayer((current) => ({
                  ...current,
                  [playerId]: value,
                }))
              }
              onResetKeeperRoundDraft={resetKeeperRoundDraft}
              onMoveKeeperRound={handleMoveKeeperRound}
              getKeeperRoundValue={getKeeperRoundValue}
              getMoveTargetRound={getMoveTargetRound}
              getKeeperCostLabel={getKeeperCostLabel}
            />
          );
        })}
      </Panel>

    </div>
  );
}
