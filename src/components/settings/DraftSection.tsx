"use client";

import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { NumericInput } from "@/components/NumericInput";
import { Button } from "@/components/ui/Button";
import { normalizeLeagueSettingsDraft } from "@/components/settings/constants";
import { calculatePlayerPoints } from "@/lib/calculatePoints";
import {
  findNextAvailableKeeperRound,
  getDraftPickContext,
  getPickIndexForTeamRound,
} from "@/lib/draft";
import { matchesPlayerSearch } from "@/lib/playerSearch";
import { useStore } from "@/store";
import type { LeagueSettings, Player, ProjectionGroup } from "@/types";

type DropEdge = { index: number; side: "before" | "after" } | null;

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
  const [draggingTeamIndex, setDraggingTeamIndex] = useState<number | null>(null);
  const [dropEdge, setDropEdge] = useState<DropEdge>(null);
  const [keeperSearchByTeam, setKeeperSearchByTeam] = useState<Record<number, string>>({});
  const [keeperRoundDraftByPlayer, setKeeperRoundDraftByPlayer] = useState<Record<string, string>>({});
  const [expandedTeamIndex, setExpandedTeamIndex] = useState<number | null>(0);
  const [isResetOpen, setIsResetOpen] = useState(false);

  const keeperEntries = Object.entries(draftState.keeperByTeam)
    .map(([playerId, teamIndex]) => ({
      player: allPlayers.find((candidate) => candidate._id === playerId) ?? null,
      playerId,
      teamIndex: Number(teamIndex),
      slotIndex: keeperSlotByPlayer[playerId] ?? null,
    }))
    .filter((entry) => entry.player !== null);

  const commitLeagueSettings = (nextNames: string[]) => {
    const next = normalizeLeagueSettingsDraft({
      ...leagueSettings,
      teamNames: nextNames,
      leagueSize: nextNames.length,
    });
    setLeagueSettings(next);
  };
  const maxKeeperRound = getTeamRosterSize(leagueSettings);

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
    setExpandedTeamIndex(to);
  };

  const finalizeTeamName = (index: number, value: string) => {
    const nextNames = [...leagueSettings.teamNames];
    nextNames[index] = value.trim().length > 0 ? value.trim() : `Team ${index + 1}`;
    commitLeagueSettings(nextNames);
  };

  const computeDropTarget = (event: React.DragEvent, index: number) => {
    if (!setupUnlocked) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    const side = event.clientY < midpoint ? "before" : "after";
    setDropEdge({ index, side });
  };

  const resolveInsertIndex = (): number | null => {
    if (draggingTeamIndex === null || dropEdge === null) return null;
    const target = dropEdge.side === "before" ? dropEdge.index : dropEdge.index + 1;
    if (draggingTeamIndex < target) return target - 1;
    if (draggingTeamIndex > target) return target;
    return null;
  };

  const lineVariant = (index: number, side: "before" | "after"): "active" | "noop" | null => {
    if (draggingTeamIndex === null || dropEdge === null) return null;
    if (dropEdge.side !== side || dropEdge.index !== index) return null;
    if (side === "before" && (index === draggingTeamIndex || index === draggingTeamIndex + 1)) {
      return "noop";
    }
    if (side === "after" && (index === draggingTeamIndex || index === draggingTeamIndex - 1)) {
      return "noop";
    }
    return "active";
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
      if (
        pickIndex !== null &&
        !isReserved &&
        pickIndex >= draftState.pickIndex
      ) {
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

  return (
    <div className="font-sans">
      <div className="mb-8">
        <h2
          className="text-xl font-bold text-[#111111] dark:text-[#e5e5e5]"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          Draft
        </h2>
        <p className="mt-1 text-sm text-[#111111]/60 dark:text-[#e5e5e5]/50">
          Manage draft order and keepers in one place, team by team.
        </p>
      </div>

      {!setupUnlocked ? (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#dc2626]/20 bg-[#dc2626]/[0.04] p-4 text-sm text-[#111111]/70 dark:border-[#ef4444]/20 dark:bg-[#ef4444]/[0.05] dark:text-[#e5e5e5]/65">
          <p className="max-w-[64ch]">
            Team order, add/remove, and league size are locked because draft activity already exists.
            Team names and keeper assignments can still be edited on the fly.
          </p>
          {hasInProgressDraft ? (
            <Button
              variant="destructiveGhost"
              size="sm"
              onClick={() => setIsResetOpen(true)}
            >
              Reset Draft
            </Button>
          ) : null}
        </div>
      ) : null}

      <div className="mb-8 rounded-lg bg-[#111111]/[0.02] p-4 dark:bg-[#e5e5e5]/[0.03]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#111111]/50 dark:text-[#e5e5e5]/42">
              League Size
            </div>
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
      </div>

      <div className="mb-3 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#111111]/50 dark:text-[#e5e5e5]/42">
          Team Setup And Keepers ({leagueSettings.teamNames.length})
        </span>
        <span className="text-[10px] text-[#111111]/45 dark:text-[#e5e5e5]/38">
          {setupUnlocked ? "Drag to reorder teams" : "Team structure locked, keeper edits still available"}
        </span>
      </div>

      <div className="grid gap-3">
        {leagueSettings.teamNames.map((name, index) => {
          const teamKeepers = keeperEntries
            .filter((entry) => entry.teamIndex === index)
            .sort((left, right) => getKeeperRoundValue(left) - getKeeperRoundValue(right));
          const keeperCandidates = expandedTeamIndex === index ? getKeeperCandidatesForTeam(index) : [];
          const keeperSearch = keeperSearchByTeam[index] ?? "";

          return (
            <div
              key={`team-${index}`}
              className="relative rounded-xl border border-[#111111]/10 bg-white/90 p-4 dark:border-[#333333] dark:bg-[#1a1a1a]/85"
              onDragOver={(event) => {
                event.preventDefault();
                computeDropTarget(event, index);
              }}
              onDrop={(event) => {
                event.preventDefault();
                const insertAt = resolveInsertIndex();
                if (draggingTeamIndex !== null && insertAt !== null) {
                  handleMoveTeamToIndex(draggingTeamIndex, insertAt);
                }
                setDraggingTeamIndex(null);
                setDropEdge(null);
              }}
            >
              {lineVariant(index, "before") !== null && (
                <div className="absolute left-5 right-5 top-0 z-10 flex -translate-y-1/2 items-center">
                  <div className={`h-2 w-2 shrink-0 rounded-full ${
                    lineVariant(index, "before") === "active"
                      ? "bg-[#dc2626] dark:bg-[#ef4444]"
                      : "bg-[#111111]/35 dark:bg-[#e5e5e5]/30"
                  }`} />
                  <div className={`h-[2px] flex-1 ${
                    lineVariant(index, "before") === "active"
                      ? "bg-[#dc2626] dark:bg-[#ef4444]"
                      : "bg-[#111111]/35 dark:bg-[#e5e5e5]/30"
                  }`} />
                </div>
              )}

              <div className="flex flex-wrap items-start gap-3">
                <div
                  draggable={setupUnlocked}
                  onDragStart={(event) => {
                    if (!setupUnlocked) return;
                    event.dataTransfer.effectAllowed = "move";
                    setDraggingTeamIndex(index);
                  }}
                  onDragEnd={() => {
                    setDraggingTeamIndex(null);
                    setDropEdge(null);
                  }}
                  className={`flex items-center gap-2 rounded-lg px-2 py-1 ${
                    setupUnlocked ? "cursor-grab active:cursor-grabbing" : "cursor-not-allowed"
                  } ${draggingTeamIndex === index ? "opacity-30" : ""}`}
                >
                  <span className="min-w-7 text-center text-xs font-bold tabular-nums text-[#111111]/45 dark:text-[#e5e5e5]/38">
                    {index + 1}
                  </span>
                  <span className={`flex shrink-0 select-none rounded p-1.5 ${
                    setupUnlocked
                      ? "text-[#111111]/45 transition-colors hover:bg-[#111111]/[0.05] hover:text-[#111111]/60 dark:text-[#e5e5e5]/38 dark:hover:bg-[#e5e5e5]/[0.05] dark:hover:text-[#e5e5e5]/55"
                      : "text-[#111111]/25 dark:text-[#e5e5e5]/20"
                  }`}>
                    <svg viewBox="0 0 16 10" className="h-2.5 w-4" fill="currentColor">
                      <circle cx="2" cy="1" r="1.25" />
                      <circle cx="8" cy="1" r="1.25" />
                      <circle cx="14" cy="1" r="1.25" />
                      <circle cx="2" cy="5" r="1.25" />
                      <circle cx="8" cy="5" r="1.25" />
                      <circle cx="14" cy="5" r="1.25" />
                      <circle cx="2" cy="9" r="1.25" />
                      <circle cx="8" cy="9" r="1.25" />
                      <circle cx="14" cy="9" r="1.25" />
                    </svg>
                  </span>
                </div>

                <div className="min-w-[12rem] flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      aria-label={`Team ${index + 1} name`}
                      defaultValue={name}
                      onChange={(event) => {
                        teamNameDraftByIndexRef.current[index] = event.target.value;
                      }}
                      onBlur={(event) => {
                        const value = teamNameDraftByIndexRef.current[index] ?? event.target.value;
                        finalizeTeamName(index, value);
                        delete teamNameDraftByIndexRef.current[index];
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.currentTarget.blur();
                        }
                      }}
                      className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 py-1 text-sm font-semibold text-[#111111] transition-colors focus:border-[#111111]/15 focus:bg-white focus:outline-none dark:text-[#e5e5e5] dark:focus:border-[#333333] dark:focus:bg-[#111111]"
                    />
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[#111111]/45 dark:text-[#e5e5e5]/38">
                    <span>{teamKeepers.length} keepers</span>
                    <span className="min-w-[5.75rem] font-mono tabular-nums">
                      Next open: {getKeeperCostLabel(index, getNextAvailableKeeperRound(index))}
                    </span>
                    {!setupUnlocked ? <span>Draft order locked</span> : null}
                  </div>
                </div>

                <div className="ml-auto flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleAddTeamBelow(index)}
                    disabled={!setupUnlocked || leagueSettings.teamNames.length >= 20}
                    aria-label={`Add team below ${name}`}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#111111]/45 transition-colors hover:bg-[#111111]/[0.05] hover:text-[#111111]/65 disabled:cursor-not-allowed disabled:opacity-30 dark:text-[#e5e5e5]/38 dark:hover:bg-[#e5e5e5]/[0.05] dark:hover:text-[#e5e5e5]/55"
                  >
                    <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                      <path d="M8 2a.75.75 0 0 1 .75.75v4.5h4.5a.75.75 0 0 1 0 1.5h-4.5v4.5a.75.75 0 0 1-1.5 0v-4.5h-4.5a.75.75 0 0 1 0-1.5h4.5v-4.5A.75.75 0 0 1 8 2Z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveTeamAt(index)}
                    disabled={!setupUnlocked || leagueSettings.teamNames.length <= 2}
                    aria-label={`Remove ${name}`}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#dc2626]/60 transition-colors hover:bg-[#dc2626]/[0.06] hover:text-[#dc2626] disabled:cursor-not-allowed disabled:opacity-30 dark:text-[#ef4444]/50 dark:hover:bg-[#ef4444]/[0.06] dark:hover:text-[#ef4444]"
                  >
                    <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                      <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="mt-4 rounded-lg bg-[#111111]/[0.03] p-3 dark:bg-[#e5e5e5]/[0.04]">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-[#111111]/50 dark:text-[#e5e5e5]/42">
                      Keepers
                    </div>
                    <p className="mt-0.5 text-xs text-[#111111]/40 dark:text-[#e5e5e5]/34">
                      One row per keeper for quick edits.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedTeamIndex((current) => (current === index ? null : index))
                    }
                    aria-label={`${expandedTeamIndex === index ? "Hide" : "Add"} keeper for ${name}`}
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#111111]/15 text-[#111111]/55 transition-colors hover:bg-white hover:text-[#111111] dark:border-[#333333] dark:text-[#e5e5e5]/50 dark:hover:bg-[#111111] dark:hover:text-[#e5e5e5]"
                  >
                    {expandedTeamIndex === index ? (
                      <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                        <path d="M3 8a.75.75 0 0 1 .75-.75h8.5a.75.75 0 0 1 0 1.5h-8.5A.75.75 0 0 1 3 8Z" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                        <path d="M8 2a.75.75 0 0 1 .75.75v4.5h4.5a.75.75 0 0 1 0 1.5h-4.5v4.5a.75.75 0 0 1-1.5 0v-4.5h-4.5a.75.75 0 0 1 0-1.5h4.5v-4.5A.75.75 0 0 1 8 2Z" />
                      </svg>
                    )}
                  </button>
                </div>

                <div className="grid gap-2">
                  {teamKeepers.length > 0 ? (
                    teamKeepers.map((entry) => (
                      <div
                        key={entry.playerId}
                        className="flex min-w-0 w-full items-center gap-3 rounded-xl border border-[#dc2626]/20 bg-[#dc2626]/[0.05] px-3 py-2 text-xs text-[#111111]/75 dark:border-[#ef4444]/20 dark:bg-[#ef4444]/[0.08] dark:text-[#e5e5e5]/70"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-semibold">{entry.player?.Name}</div>
                          <div className="flex min-w-0 items-center gap-2 text-[#111111]/45 dark:text-[#e5e5e5]/38">
                            <span className="truncate">{entry.player?.Team}</span>
                          </div>
                        </div>
                        <div className="ml-auto flex shrink-0 items-center gap-2">
                          <div className="flex items-center gap-1 rounded-lg border border-[#111111]/10 bg-white/70 px-2 py-1 dark:border-[#333333] dark:bg-[#111111]/60">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-[#111111]/40 dark:text-[#e5e5e5]/35">
                              Rd
                            </span>
                            <input
                              type="text"
                              inputMode="numeric"
                              aria-label={`Keeper round for ${entry.player?.Name ?? entry.playerId}`}
                              value={
                                keeperRoundDraftByPlayer[entry.playerId] ?? String(getKeeperRoundValue(entry))
                              }
                              onChange={(event) => {
                                const nextValue = event.target.value.replace(/[^0-9]/g, "");
                                setKeeperRoundDraftByPlayer((current) => ({
                                  ...current,
                                  [entry.playerId]: nextValue,
                                }));
                              }}
                              onBlur={() => {
                                const nextValue = keeperRoundDraftByPlayer[entry.playerId];
                                if (!nextValue) {
                                  resetKeeperRoundDraft(entry.playerId);
                                  return;
                                }
                                handleCommitKeeperRound(entry.teamIndex, entry.playerId, Number(nextValue));
                              }}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  event.preventDefault();
                                  event.currentTarget.blur();
                                }
                                if (event.key === "Escape") {
                                  resetKeeperRoundDraft(entry.playerId);
                                  event.currentTarget.blur();
                                }
                              }}
                              className="w-9 bg-transparent text-right text-sm font-semibold tabular-nums text-[#111111] outline-none dark:text-[#e5e5e5]"
                            />
                            <button
                              type="button"
                              onClick={() => handleMoveKeeperRound(entry.teamIndex, entry.playerId, "earlier")}
                              disabled={getMoveTargetRound(entry.teamIndex, entry.playerId, "earlier") === null}
                              aria-label={`Move keeper ${entry.player?.Name ?? entry.playerId} earlier`}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[#111111]/10 text-[#111111]/55 transition-colors hover:bg-white hover:text-[#111111] disabled:cursor-not-allowed disabled:opacity-30 dark:border-[#333333] dark:text-[#e5e5e5]/50 dark:hover:bg-[#111111] dark:hover:text-[#e5e5e5]"
                            >
                              <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                                <path d="M8 4.22a.75.75 0 0 1 .53.22l4 4a.75.75 0 0 1-1.06 1.06L8 6.06 4.53 9.5a.75.75 0 1 1-1.06-1.06l4-4A.75.75 0 0 1 8 4.22Z" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveKeeperRound(entry.teamIndex, entry.playerId, "later")}
                              disabled={getMoveTargetRound(entry.teamIndex, entry.playerId, "later") === null}
                              aria-label={`Move keeper ${entry.player?.Name ?? entry.playerId} later`}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[#111111]/10 text-[#111111]/55 transition-colors hover:bg-white hover:text-[#111111] disabled:cursor-not-allowed disabled:opacity-30 dark:border-[#333333] dark:text-[#e5e5e5]/50 dark:hover:bg-[#111111] dark:hover:text-[#e5e5e5]"
                            >
                              <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                                <path d="M8 11.78a.75.75 0 0 1-.53-.22l-4-4A.75.75 0 0 1 4.53 6.5L8 9.94l3.47-3.44a.75.75 0 1 1 1.06 1.06l-4 4a.75.75 0 0 1-.53.22Z" />
                              </svg>
                            </button>
                          </div>
                          <span className="min-w-[4.75rem] text-right text-[10px] font-bold uppercase tracking-widest text-[#dc2626]/80 dark:text-[#ef4444]/80">
                            {getKeeperCostLabel(entry.teamIndex, getKeeperRoundValue(entry))}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeKeeper(entry.playerId)}
                          aria-label={`Remove keeper ${entry.player?.Name ?? entry.playerId}`}
                          className="text-[10px] font-bold uppercase tracking-widest text-[#dc2626] dark:text-[#ef4444]"
                        >
                          Remove
                        </button>
                      </div>
                    ))
                  ) : (
                    <span className="text-sm text-[#111111]/40 dark:text-[#e5e5e5]/32">
                      No keepers assigned.
                    </span>
                  )}
                </div>

                {expandedTeamIndex === index ? (
                  <div className="mt-3 border-t border-[#111111]/10 pt-3 dark:border-[#333333]">
                    {activeGroup ? (
                      <>
                        <div className="grid gap-3">
                          <input
                            type="text"
                            aria-label={`Search keepers for ${name}`}
                            value={keeperSearch}
                            onChange={(event) =>
                              setKeeperSearchByTeam((current) => ({
                                ...current,
                                [index]: event.target.value,
                              }))
                            }
                            placeholder={`Search available players for ${name}`}
                            className="w-full rounded-sm border border-[#111111]/20 bg-white px-3 py-2 text-sm text-[#111111] placeholder:text-[#111111]/35 focus:border-[#dc2626] focus:outline-none dark:border-[#333333] dark:bg-[#1a1a1a] dark:text-[#e5e5e5] dark:placeholder:text-[#e5e5e5]/30 dark:focus:border-[#ef4444]"
                          />
                          <p className="text-xs text-[#111111]/45 dark:text-[#e5e5e5]/38">
                            New keepers are added to the next open slot for this team. Use Rd or the arrows to move them to any open round.
                          </p>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {keeperCandidates.map((player) => (
                            <button
                              key={player._id}
                              type="button"
                              onClick={() => {
                                setKeeperForTeam(
                                  player._id,
                                  index,
                                  getNextAvailableKeeperRound(index)
                                );
                                setKeeperSearchByTeam((current) => ({
                                  ...current,
                                  [index]: "",
                                }));
                              }}
                              className="inline-flex items-center gap-2 rounded-full border border-[#111111]/15 bg-white px-3 py-2 text-left text-xs text-[#111111]/75 transition-colors hover:border-[#dc2626]/30 hover:bg-[#dc2626]/[0.04] dark:border-[#333333] dark:bg-[#1a1a1a] dark:text-[#e5e5e5]/70 dark:hover:border-[#ef4444]/30 dark:hover:bg-[#ef4444]/[0.05]"
                            >
                              <span className="font-semibold text-[#111111] dark:text-[#e5e5e5]">
                                {player.Name}
                              </span>
                              <span className="text-[#111111]/45 dark:text-[#e5e5e5]/38">{player.Team}</span>
                            </button>
                          ))}
                        </div>
                        {keeperCandidates.length === 0 ? (
                          <p className="mt-3 text-sm text-[#111111]/45 dark:text-[#e5e5e5]/38">
                            {allPlayers.length === 0
                              ? "Upload projections to assign keepers."
                              : keeperSearch.trim().length === 0
                                ? "Type to search for an available keeper."
                                : "No available players match this search."}
                          </p>
                        ) : null}
                      </>
                    ) : (
                      <p className="text-sm text-[#111111]/45 dark:text-[#e5e5e5]/38">
                        Upload or select a projection set before assigning keepers.
                      </p>
                    )}
                  </div>
                ) : null}
              </div>

              {lineVariant(index, "after") !== null && (
                <div className="absolute bottom-0 left-5 right-5 z-10 flex translate-y-1/2 items-center">
                  <div className={`h-2 w-2 shrink-0 rounded-full ${
                    lineVariant(index, "after") === "active"
                      ? "bg-[#dc2626] dark:bg-[#ef4444]"
                      : "bg-[#111111]/35 dark:bg-[#e5e5e5]/30"
                  }`} />
                  <div className={`h-[2px] flex-1 ${
                    lineVariant(index, "after") === "active"
                      ? "bg-[#dc2626] dark:bg-[#ef4444]"
                      : "bg-[#111111]/35 dark:bg-[#e5e5e5]/30"
                  }`} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {isResetOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111111]/20 dark:bg-black/60">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-reset-draft-title"
            className="relative mx-0 h-full w-full max-w-none rounded-none border-l-4 border-l-[#dc2626] border-y border-r border-y-[#111111]/10 border-r-[#111111]/10 bg-white p-8 dark:border-l-[#ef4444] dark:border-y-[#333333] dark:border-r-[#333333] dark:bg-[#111111] sm:mx-4 sm:h-auto sm:max-w-md sm:rounded-sm"
          >
            <button
              type="button"
              onClick={() => setIsResetOpen(false)}
              aria-label="Close reset draft modal"
              className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center text-[#111111]/50 transition-colors hover:text-[#111111] dark:text-[#e5e5e5]/40 dark:hover:text-[#e5e5e5]"
            >
              <span className="text-xl leading-none font-sans">&times;</span>
            </button>
            <h2
              id="settings-reset-draft-title"
              className="mb-3 pr-10 text-xl font-bold text-[#111111] dark:text-[#e5e5e5]"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            >
              Reset all draft picks?
            </h2>
            <p className="mb-8 text-sm leading-relaxed text-[#111111]/60 dark:text-[#e5e5e5]/50">
              This clears only the in-progress drafted picks for the current league. Keeper assignments
              stay in place, and projection data is unchanged.
            </p>
            <div className="flex justify-end gap-3">
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
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
