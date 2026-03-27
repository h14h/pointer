"use client";

import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { NumericInput } from "@/components/NumericInput";
import { DraftTeamRow, type DraftKeeperEntry } from "@/components/settings/DraftTeamRow";
import { normalizeLeagueSettingsDraft } from "@/components/settings/constants";
import { Button } from "@/components/ui/Button";
import { DialogShell } from "@/components/ui/DialogShell";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { Panel } from "@/components/ui/Panel";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { calculatePlayerPoints } from "@/lib/calculatePoints";
import {
  findNextAvailableKeeperRound,
  getDraftPickContext,
  getPickIndexForTeamRound,
} from "@/lib/draft";
import { matchesPlayerSearch } from "@/lib/playerSearch";
import { useStore } from "@/store";
import type { LeagueSettings, Player, ProjectionGroup } from "@/types";

function getActiveGroup(
  projectionGroups: ProjectionGroup[],
  activeProjectionGroupId: string | null
) {
  return (
    projectionGroups.find((group) => group.id === activeProjectionGroupId) ??
    projectionGroups[0] ??
    null
  );
}

function getAllPlayers(activeGroup: ProjectionGroup | null): Player[] {
  if (!activeGroup) return [];
  return [...activeGroup.batters, ...activeGroup.pitchers, ...activeGroup.twoWayPlayers];
}

function getTeamRosterSize(leagueSettings: LeagueSettings) {
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
    setLeagueSettings,
    projectionGroups,
    activeProjectionGroupId,
    setKeeperForTeam,
    removeKeeper,
    resetDraft,
    canEditDraftSetup,
  } = useStore();
  const activeLeague = leagues.find((l) => l.id === activeLeagueId) ?? leagues[0];
  const leagueSettings = activeLeague?.leagueSettings;
  const draftState = activeLeague?.draftState;
  const activeGroup = getActiveGroup(projectionGroups, activeProjectionGroupId);
  const allPlayers = useMemo(() => getAllPlayers(activeGroup), [activeGroup]);
  const keeperSlotByPlayer = draftState?.keeperSlotByPlayer ?? {};
  const hasInProgressDraft =
    Object.keys(draftState?.draftedByTeam ?? {}).filter(
      (playerId) => draftState?.keeperByTeam?.[playerId] === undefined
    ).length > 0;
  const setupUnlocked =
    typeof canEditDraftSetup === "function"
      ? canEditDraftSetup()
      : Object.keys(draftState?.draftedByTeam ?? {}).length === 0 &&
        Object.keys(draftState?.keeperByTeam ?? {}).length === 0;

  const teamNameDraftByIndexRef = useRef<Record<number, string>>({});
  const [keeperSearchByTeam, setKeeperSearchByTeam] = useState<Record<number, string>>({});
  const [keeperRoundDraftByPlayer, setKeeperRoundDraftByPlayer] = useState<Record<string, string>>({});
  const [recentlyEditedKeeperIdByTeam, setRecentlyEditedKeeperIdByTeam] = useState<
    Record<number, string | null>
  >({});
  const [expandedTeamIndex, setExpandedTeamIndex] = useState<number | null>(null);
  const [isResetOpen, setIsResetOpen] = useState(false);

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
    setLeagueSettings(next);
  };

  const maxKeeperRound = getTeamRosterSize(leagueSettings);

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

  const getSortedTeamKeepers = (teamIndex: number) =>
    keeperEntries
      .filter((entry) => entry.teamIndex === teamIndex)
      .sort((left, right) => getKeeperRoundValue(left) - getKeeperRoundValue(right));

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

    setRecentlyEditedKeeperIdByTeam((current) => ({
      ...current,
      [teamIndex]: playerId,
    }));
    setKeeperForTeam(playerId, teamIndex, normalizedRound);
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
    setRecentlyEditedKeeperIdByTeam((current) => ({
      ...current,
      [teamIndex]: playerId,
    }));
    setKeeperForTeam(playerId, teamIndex, targetRound);
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

  const getKeeperCandidatesForTeam = (teamIndex: number) => {
    const search = keeperSearchByTeam[teamIndex] ?? "";
    if (search.trim().length === 0) return [];
    return allPlayers
      .filter((player) => draftState.draftedByTeam[player._id] === undefined)
      .filter((player) => draftState.keeperByTeam[player._id] === undefined)
      .filter((player) => matchesPlayerSearch(player, search))
      .sort((left, right) => {
        const pointDelta =
          calculatePlayerPoints(right, activeLeague.scoringSettings) -
          calculatePlayerPoints(left, activeLeague.scoringSettings);
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

  const handleAddTeamBelow = (index: number) => {
    if (!setupUnlocked || leagueSettings.teamNames.length >= 20) return;
    const nextNames = [...leagueSettings.teamNames];
    nextNames.splice(index + 1, 0, `Team ${nextNames.length + 1}`);
    commitLeagueSettings(nextNames);
    setExpandedTeamIndex(index + 1);
  };

  const handleRemoveTeamAt = (index: number) => {
    if (!setupUnlocked || leagueSettings.teamNames.length <= 2) return;
    const nextNames = leagueSettings.teamNames.filter((_, teamIndex) => teamIndex !== index);
    commitLeagueSettings(nextNames);
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
    setExpandedTeamIndex((current) => getExpandedIndexAfterMove(current, from, to));
  };

  const finalizeTeamName = (index: number, value: string) => {
    const nextNames = [...leagueSettings.teamNames];
    nextNames[index] = value.trim().length > 0 ? value.trim() : `Team ${index + 1}`;
    commitLeagueSettings(nextNames);
  };

  return (
    <div className="font-sans">
      <SectionHeader
        className="mb-8"
        title="Draft"
        description="Manage draft order and keepers in one place, team by team."
      />

      {!setupUnlocked ? (
        <Panel tone="danger" padding="md" className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg text-sm text-[#111111]/70 dark:text-[#e5e5e5]/65">
          <p className="max-w-[64ch]">
            Team order, add/remove, and league size are locked because draft activity already exists.
            Reorder controls are disabled, but team names and keeper assignments can still be edited.
          </p>
          {hasInProgressDraft ? (
            <Button variant="destructiveGhost" size="sm" onClick={() => setIsResetOpen(true)}>
              Reset Draft
            </Button>
          ) : null}
        </Panel>
      ) : null}

      <Panel tone="muted" padding="md" className="mb-8 rounded-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <FieldLabel className="block">League Size</FieldLabel>
            <p className="mt-0.5 text-xs text-[#111111]/45 dark:text-[#e5e5e5]/38">
              Structural team changes lock once draft activity begins.
            </p>
          </div>
          <NumericInput
            aria-label="League size"
            units="teams"
            increment={1}
            min={2}
            max={20}
            value={leagueSettings.leagueSize}
            onCommit={handleLeagueSizeCommit}
            inputClassName="w-14"
            disabled={!setupUnlocked}
          />
        </div>
      </Panel>

      <div className="mb-3 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#111111]/50 dark:text-[#e5e5e5]/42">
          Draft Order ({leagueSettings.teamNames.length})
        </span>
        <span className="text-[10px] text-[#111111]/45 dark:text-[#e5e5e5]/38">
          {setupUnlocked
            ? "Use move-to-position controls for quick reordering"
            : "Reorder controls locked, keeper edits still available"}
        </span>
      </div>

      <div className="grid gap-3">
        {leagueSettings.teamNames.map((name, index) => {
          const teamKeepers = getSortedTeamKeepers(index);
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
              collapsedKeeperBadges={teamKeepers.map((entry) => ({
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
              recentlyEditedKeeperId={recentlyEditedKeeperIdByTeam[index] ?? null}
              onToggleExpanded={() =>
                setExpandedTeamIndex((current) => (current === index ? null : index))
              }
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
                setKeeperForTeam(playerId, index, getNextAvailableKeeperRound(index));
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
      </div>

      {isResetOpen ? (
        <DialogShell
          title="Reset all draft picks?"
          description="This clears only the in-progress drafted picks for the current league. Keeper assignments stay in place, and projection data is unchanged."
          labelledBy="settings-reset-draft-title"
          onClose={() => setIsResetOpen(false)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setIsResetOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  resetDraft();
                  setIsResetOpen(false);
                }}
              >
                Reset Draft
              </Button>
            </>
          }
        />
      ) : null}
    </div>
  );
}
