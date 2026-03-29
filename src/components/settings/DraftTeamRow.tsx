"use client";

import { useLayoutEffect, useRef, useState, type KeyboardEvent, type MutableRefObject } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/Button";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { Input } from "@/components/ui/input";
import { Dropdown } from "@/components/ui/Dropdown";
import type { Player } from "@/types";

export type DraftKeeperEntry = {
  player: Player | null;
  playerId: string;
  teamIndex: number;
  slotIndex: number | null;
};

type CollapsedKeeperBadge = {
  playerId: string;
  label: string;
};

interface DraftTeamRowProps {
  index: number;
  name: string;
  leagueSize: number;
  isExpanded: boolean;
  setupUnlocked: boolean;
  teamKeepers: DraftKeeperEntry[];
  collapsedKeeperBadges: CollapsedKeeperBadge[];
  maxTeamsReached: boolean;
  minTeamsReached: boolean;
  teamNameDraftByIndexRef: MutableRefObject<Record<number, string>>;
  keeperSearch: string;
  keeperCandidates: Player[];
  hasActiveProjectionGroup: boolean;
  keeperRoundDraftByPlayer: Record<string, string>;
  recentlyEditedKeeperId: string | null;
  onToggleExpanded: () => void;
  onReorder: (nextPosition: number) => void;
  onAddTeamBelow: () => void;
  onRemoveTeam: () => void;
  onFinalizeTeamName: (value: string) => void;
  onKeeperSearchChange: (value: string) => void;
  onAssignKeeper: (playerId: string) => void;
  onRemoveKeeper: (playerId: string) => void;
  onCommitKeeperRound: (teamIndex: number, playerId: string, requestedRound: number) => void;
  onKeeperRoundDraftChange: (playerId: string, value: string) => void;
  onResetKeeperRoundDraft: (playerId: string) => void;
  onMoveKeeperRound: (teamIndex: number, playerId: string, direction: "earlier" | "later") => void;
  getKeeperRoundValue: (entry: { teamIndex: number; slotIndex: number | null }) => number;
  getMoveTargetRound: (
    teamIndex: number,
    playerId: string,
    direction: "earlier" | "later"
  ) => number | null;
  getKeeperCostLabel: (teamIndex: number, round: number | null) => string;
}

export function DraftTeamRow({
  index,
  name,
  leagueSize,
  isExpanded,
  setupUnlocked,
  teamKeepers,
  collapsedKeeperBadges,
  maxTeamsReached,
  minTeamsReached,
  teamNameDraftByIndexRef,
  keeperSearch,
  keeperCandidates,
  hasActiveProjectionGroup,
  keeperRoundDraftByPlayer,
  recentlyEditedKeeperId,
  onToggleExpanded,
  onReorder,
  onAddTeamBelow,
  onRemoveTeam,
  onFinalizeTeamName,
  onKeeperSearchChange,
  onAssignKeeper,
  onRemoveKeeper,
  onCommitKeeperRound,
  onKeeperRoundDraftChange,
  onResetKeeperRoundDraft,
  onMoveKeeperRound,
  getKeeperRoundValue,
  getMoveTargetRound,
  getKeeperCostLabel,
}: DraftTeamRowProps) {
  const previousKeeperOrderRef = useRef<string[]>(teamKeepers.map((entry) => entry.playerId));
  const [fadingKeeperIds, setFadingKeeperIds] = useState<string[]>([]);

  const handleTeamNameKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.currentTarget.blur();
    }
  };

  useLayoutEffect(() => {
    const currentKeeperOrder = teamKeepers.map((entry) => entry.playerId);
    const previousKeeperOrder = previousKeeperOrderRef.current;
    let timeoutId: number | null = null;

    if (previousKeeperOrder.length > 0 && recentlyEditedKeeperId !== null) {
      const movedOtherKeeperIds = currentKeeperOrder.filter((playerId, currentIndex) => {
        const previousIndex = previousKeeperOrder.indexOf(playerId);
        return playerId !== recentlyEditedKeeperId && previousIndex !== -1 && previousIndex !== currentIndex;
      });

      if (movedOtherKeeperIds.length > 0) {
        setFadingKeeperIds(movedOtherKeeperIds);
        timeoutId = window.setTimeout(() => {
          setFadingKeeperIds([]);
        }, 450);
      }
    }

    previousKeeperOrderRef.current = currentKeeperOrder;

    return () => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [recentlyEditedKeeperId, teamKeepers]);

  return (
    <div className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-base)]/90 px-4 py-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-surface-muted)] text-sm font-bold tabular-nums text-[var(--color-fg-muted)]">
            {index + 1}
          </div>

          <div className="min-w-0 flex-1">
            <Input
              type="text"
              tone="subtle"
              inputSize="sm"
              aria-label={`Team ${index + 1} name`}
              defaultValue={name}
              onChange={(event) => {
                teamNameDraftByIndexRef.current[index] = event.target.value;
              }}
              onBlur={(event) => {
                const value = teamNameDraftByIndexRef.current[index] ?? event.target.value;
                onFinalizeTeamName(value);
                delete teamNameDraftByIndexRef.current[index];
              }}
              onKeyDown={handleTeamNameKeyDown}
              className="min-w-0 border-transparent bg-transparent font-semibold"
            />

            {collapsedKeeperBadges.length === 0 ? (
              <div className="mt-2 text-xs font-medium text-[var(--color-fg-subtle)]">
                No Keepers
              </div>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                {collapsedKeeperBadges.map((badge) => (
                  <Badge key={badge.playerId} variant="ownershipKeeper" size="md" className="whitespace-nowrap font-medium normal-case tracking-normal">
                    {badge.label}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-fg-subtle)]">
            <span>Move to</span>
            <Dropdown
              value={index + 1}
              onChange={(nextPosition) => onReorder(nextPosition - 1)}
              ariaLabel={`Draft position for ${name}`}
              disabled={!setupUnlocked}
              triggerClassName="h-8 px-2 text-xs text-[var(--color-fg-default)]"
              options={Array.from({ length: leagueSize }, (_, position) => ({
                value: position + 1,
                label: String(position + 1),
              }))}
            />
          </label>
          <Button
            type="button"
            onClick={onToggleExpanded}
            aria-expanded={isExpanded}
            aria-controls={`team-keepers-panel-${index}`}
            aria-label={`${isExpanded ? "Hide" : "Show"} keepers for ${name}`}
            variant="toolbar"
            size="sm"
          >
            {isExpanded ? "Hide Keepers" : "Edit Keepers"}
          </Button>
          <Button
            type="button"
            onClick={onAddTeamBelow}
            disabled={!setupUnlocked || maxTeamsReached}
            aria-label={`Add team below ${name}`}
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-md"
          >
            <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
              <path d="M8 2a.75.75 0 0 1 .75.75v4.5h4.5a.75.75 0 0 1 0 1.5h-4.5v4.5a.75.75 0 0 1-1.5 0v-4.5h-4.5a.75.75 0 0 1 0-1.5h4.5v-4.5A.75.75 0 0 1 8 2Z" />
            </svg>
          </Button>
          <Button
            type="button"
            onClick={onRemoveTeam}
            disabled={!setupUnlocked || minTeamsReached}
            aria-label={`Remove ${name}`}
            variant="toolbarDanger"
            size="icon"
            className="h-8 w-8 rounded-md"
          >
            <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
              <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
            </svg>
          </Button>
        </div>
      </div>

      {isExpanded ? (
        <div
          id={`team-keepers-panel-${index}`}
          className="mt-4 rounded-lg bg-[var(--color-surface-muted)] p-3"
        >
          <div className="mb-3">
            <FieldLabel className="block">Keepers</FieldLabel>
            <p className="mt-0.5 text-xs text-[var(--color-fg-subtle)]">
              One row per keeper for quick edits.
            </p>
          </div>

          <div className="grid gap-2">
            {teamKeepers.length > 0 ? (
              teamKeepers.map((entry) => (
                <div
                  key={entry.playerId}
                  data-keeper-row={entry.playerId}
                  className={`flex min-w-0 w-full items-center gap-3 rounded-xl border border-[color:color-mix(in_srgb,var(--color-accent)_20%,transparent)] bg-[color:color-mix(in_srgb,var(--color-accent)_5%,transparent)] px-3 py-2 text-xs text-[var(--color-fg-muted)] ${
                    fadingKeeperIds.includes(entry.playerId)
                      ? "keeper-row-fade-in"
                      : ""
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{entry.player?.Name}</div>
                    <div className="flex min-w-0 items-center gap-2 text-[var(--color-fg-subtle)]">
                      <span className="truncate">{entry.player?.Team}</span>
                    </div>
                  </div>
                  <div className="ml-auto flex shrink-0 items-center gap-2">
                    <div className="flex items-center gap-1 rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-base)]/70 px-2 py-1">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-fg-subtle)]">
                        Rd
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        aria-label={`Keeper round for ${entry.player?.Name ?? entry.playerId}`}
                        value={
                          keeperRoundDraftByPlayer[entry.playerId] ?? String(getKeeperRoundValue(entry))
                        }
                        onFocus={(event) => {
                          event.currentTarget.select();
                        }}
                        onChange={(event) => {
                          const nextValue = event.target.value.replace(/[^0-9]/g, "");
                          onKeeperRoundDraftChange(entry.playerId, nextValue);
                        }}
                        onBlur={() => {
                          const nextValue = keeperRoundDraftByPlayer[entry.playerId];
                          if (!nextValue) {
                            onResetKeeperRoundDraft(entry.playerId);
                            return;
                          }
                          onCommitKeeperRound(entry.teamIndex, entry.playerId, Number(nextValue));
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            event.currentTarget.blur();
                          }
                          if (event.key === "Escape") {
                            onResetKeeperRoundDraft(entry.playerId);
                            event.currentTarget.blur();
                          }
                        }}
                        className="w-9 bg-transparent text-center text-sm font-semibold tabular-nums text-[var(--color-fg-default)] outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => onMoveKeeperRound(entry.teamIndex, entry.playerId, "earlier")}
                        disabled={getMoveTargetRound(entry.teamIndex, entry.playerId, "earlier") === null}
                        aria-label={`Move keeper ${entry.player?.Name ?? entry.playerId} earlier`}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[var(--color-border-soft)] text-[var(--color-fg-muted)] transition-colors hover:bg-[var(--color-surface-base)] hover:text-[var(--color-fg-default)] disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                          <path d="M8 4.22a.75.75 0 0 1 .53.22l4 4a.75.75 0 0 1-1.06 1.06L8 6.06 4.53 9.5a.75.75 0 1 1-1.06-1.06l4-4A.75.75 0 0 1 8 4.22Z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => onMoveKeeperRound(entry.teamIndex, entry.playerId, "later")}
                        disabled={getMoveTargetRound(entry.teamIndex, entry.playerId, "later") === null}
                        aria-label={`Move keeper ${entry.player?.Name ?? entry.playerId} later`}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[var(--color-border-soft)] text-[var(--color-fg-muted)] transition-colors hover:bg-[var(--color-surface-base)] hover:text-[var(--color-fg-default)] disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                          <path d="M8 11.78a.75.75 0 0 1-.53-.22l-4-4A.75.75 0 0 1 4.53 6.5L8 9.94l3.47-3.44a.75.75 0 1 1 1.06 1.06l-4 4a.75.75 0 0 1-.53.22Z" />
                        </svg>
                      </button>
                    </div>
                    <span className="min-w-[4.75rem] text-right text-[10px] font-bold uppercase tracking-widest text-[var(--color-accent)]/80">
                      {getKeeperCostLabel(entry.teamIndex, getKeeperRoundValue(entry))}
                    </span>
                  </div>
                  <Button
                    type="button"
                    onClick={() => onRemoveKeeper(entry.playerId)}
                    aria-label={`Remove keeper ${entry.player?.Name ?? entry.playerId}`}
                    variant="destructiveGhost"
                    size="sm"
                  >
                    Remove
                  </Button>
                </div>
              ))
            ) : (
              <span className="text-sm text-[var(--color-fg-subtle)]">
                No keepers assigned.
              </span>
            )}
          </div>

          <div className="mt-3 border-t border-[var(--color-border-soft)] pt-3">
            {hasActiveProjectionGroup ? (
              <>
                <div className="grid gap-3">
                  <Input
                    type="text"
                    aria-label={`Search keepers for ${name}`}
                    value={keeperSearch}
                    onChange={(event) => onKeeperSearchChange(event.target.value)}
                    placeholder={`Search available players for ${name}`}
                    className="w-full"
                  />
                  <p className="text-xs text-[var(--color-fg-subtle)]">
                    New keepers are added to the next open slot for this team. Use Rd or the arrows to move them to any open round.
                  </p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {keeperCandidates.map((player) => (
                    <button
                      key={player._id}
                      type="button"
                      onClick={() => onAssignKeeper(player._id)}
                      className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border-soft)] bg-[var(--color-surface-base)] px-3 py-2 text-left text-xs text-[var(--color-fg-muted)] transition-colors hover:border-[color:color-mix(in_srgb,var(--color-accent)_30%,transparent)] hover:bg-[color:color-mix(in_srgb,var(--color-accent)_4%,transparent)]"
                    >
                      <span className="font-semibold text-[var(--color-fg-default)]">
                        {player.Name}
                      </span>
                      <span className="text-[var(--color-fg-subtle)]">{player.Team}</span>
                    </button>
                  ))}
                </div>
                {keeperCandidates.length === 0 ? (
                  <p className="mt-3 text-sm text-[var(--color-fg-subtle)]">
                    {keeperSearch.trim().length === 0
                      ? "Type to search for an available keeper."
                      : "No available players match this search."}
                  </p>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-[var(--color-fg-subtle)]">
                Upload or select a projection set before assigning keepers.
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
