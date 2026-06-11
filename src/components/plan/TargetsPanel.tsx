"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { LedgerRow } from "@/components/ui/LedgerRow";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { matchesPlayerSearch } from "@/lib/leaderboard";
import { cn } from "@/lib/utils";
import { formatTakeBy, type PlanPlayer } from "./planData";

/**
 * The targets rail: an add-target search over the ranked pool plus the
 * flagged shortlist, with "take by" guidance against my pick slots.
 */
export function TargetsPanel({
  players,
  targetIds,
  myPickOveralls,
  onToggleTarget,
}: {
  players: PlanPlayer[];
  targetIds: string[];
  myPickOveralls: number[];
  onToggleTarget: (playerId: string) => void;
}) {
  const [search, setSearch] = useState("");

  const playerById = useMemo(
    () => new Map(players.map((player) => [player.id, player])),
    [players]
  );

  const results = useMemo(() => {
    if (search.trim() === "") return [];
    const flagged = new Set(targetIds);
    return players
      .filter(
        (player) =>
          !flagged.has(player.id) &&
          matchesPlayerSearch({ Name: player.name, Team: player.team }, search)
      )
      .slice(0, 5);
  }, [players, targetIds, search]);

  return (
    <Panel as="section" padding="none">
      <PanelHeader
        title="Targets"
        right={<span className="stamp font-data">{targetIds.length} flagged</span>}
      />

      <div className="relative border-b border-[var(--color-border-soft)] px-4 py-2.5">
        <Input
          tone="underline"
          inputSize="sm"
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="add a target — search the board…"
          aria-label="Search players to flag as targets"
          className="font-data text-xs"
        />
        {results.length > 0 ? (
          <div className="absolute inset-x-4 top-full z-20 -mt-px overflow-hidden rounded-[var(--radius-sm)] border border-[var(--color-border-default)] bg-[var(--color-surface-overlay)] shadow-[var(--shadow-overlay)]">
            {results.map((player) => (
              <LedgerRow
                key={player.id}
                as="button"
                onClick={() => {
                  onToggleTarget(player.id);
                  setSearch("");
                }}
                className="w-full py-2 text-left hover:bg-[var(--color-surface-hover)]"
              >
                <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-[var(--color-fg-default)]">
                  {player.name}
                </span>
                <span className="font-data shrink-0 text-[10px] text-[var(--color-fg-muted)]">
                  {player.pos} · {player.team} · rk {player.rank}
                </span>
              </LedgerRow>
            ))}
          </div>
        ) : null}
      </div>

      {targetIds.length === 0 ? (
        <p className="px-4 py-3.5 text-[12.5px] text-[var(--color-fg-muted)]">
          flag players from the search above — targets glow in the draft room.
        </p>
      ) : (
        targetIds.map((id) => {
          const player = playerById.get(id);
          const gone = player ? player.isDrafted || player.isKeeper : false;
          return (
            <LedgerRow key={id} className="items-center gap-2.5 py-2">
              <span
                className={cn(
                  "min-w-0 flex-1 truncate text-[13px] font-semibold",
                  gone || !player
                    ? "text-[var(--color-fg-muted)] line-through"
                    : "text-[var(--color-fg-default)]"
                )}
              >
                {player?.name ?? id}
              </span>
              {gone ? <span className="stamp shrink-0">gone</span> : null}
              {player && !gone ? (
                <span className="font-data shrink-0 text-[10px] text-[var(--color-fg-muted)]">
                  {player.pos} · {player.team} · rk {player.rank} ·{" "}
                  {formatTakeBy(player.rank, myPickOveralls)}
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => onToggleTarget(id)}
                aria-label={`Remove ${player?.name ?? id} from targets`}
                className="flex size-5 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--color-border-soft)] text-[11px] leading-none text-[var(--color-fg-muted)] hover:border-[var(--color-warning)] hover:text-[var(--color-warning)]"
              >
                ✕
              </button>
            </LedgerRow>
          );
        })
      )}
    </Panel>
  );
}
