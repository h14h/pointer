"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { normalizePlayerSearchText } from "@/lib/leaderboard";
import type { Sport } from "@/types";
import { formatPar, pad2, type RoomPlayer } from "./model";

const FOOTBALL_FILTERS = ["ALL", "QB", "RB", "WR", "TE", "K", "DST"] as const;
const BASEBALL_FILTERS = ["ALL", "Batters", "Pitchers"] as const;

function matchesFilter(player: RoomPlayer, filter: string): boolean {
  if (filter === "ALL") return true;
  if (filter === "Batters")
    return player.kind === "batter" || player.kind === "two-way";
  if (filter === "Pitchers")
    return player.kind === "pitcher" || player.kind === "two-way";
  return player.pos === filter;
}

/**
 * The board — ranked available players, dense and scannable. Clicking a row
 * (or its log button) drafts the player to whichever team is on the clock.
 */
export function Board({
  available,
  targetIds,
  sport,
  hasBye,
  onClockTeamName,
  onLog,
}: {
  available: RoomPlayer[];
  targetIds: Set<string>;
  sport: Sport;
  hasBye: boolean;
  onClockTeamName: string;
  onLog: (player: RoomPlayer) => void;
}) {
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const filters = sport === "football" ? FOOTBALL_FILTERS : BASEBALL_FILTERS;

  const rows = useMemo(() => {
    const q = normalizePlayerSearchText(search.trim());
    return available.filter(
      (p) => matchesFilter(p, filter) && (q === "" || p.searchText.includes(q)),
    );
  }, [available, filter, search]);

  return (
    <section className="flex min-h-0 min-w-0 flex-[2] flex-col overflow-y-auto rounded-[var(--radius-lg)] border border-[var(--color-border-soft)] bg-[var(--color-surface-base)]">
      <div className="sticky top-0 z-[var(--z-sticky)] flex flex-wrap items-center gap-1.5 border-b border-[var(--color-border-soft)] bg-[var(--color-surface-base)] px-3 py-2">
        <span className="stamp mr-1.5">the board</span>
        {/* Kept as bespoke buttons (not kit Button): size="sm"'s min-width
            bloats seven tiny position toggles, and the active state here is a
            solid accent fill, not toolbarActive's tint. Typography/tracking
            tokens are aligned to Chip instead. */}
        {filters.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={
              filter === f
                ? "font-data rounded-[var(--radius-sm)] border border-[var(--color-accent)] bg-[var(--color-accent)] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--color-accent-fg)]"
                : "font-data rounded-[var(--radius-sm)] border border-[var(--color-border-soft)] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--color-fg-muted)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-fg-default)]"
            }
          >
            {f}
          </button>
        ))}
        <Input
          tone="underline"
          inputSize="sm"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="search…"
          aria-label="search the board"
          className="font-data ml-auto h-6 w-36 text-xs"
        />
      </div>

      {rows.length === 0 ? (
        <p className="px-4 py-6 text-sm text-[var(--color-fg-muted)]">
          {available.length === 0
            ? "no available players — check the projection source on the intel tab."
            : "nothing matches — clear the search or widen the position filter."}
        </p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="stamp-strong sticky top-[41px] z-[var(--z-sticky)] border-b border-[var(--color-border-soft)] bg-[var(--color-surface-base)] px-2 py-1.5 text-left">
                RNK
              </th>
              <th className="stamp-strong sticky top-[41px] z-[var(--z-sticky)] border-b border-[var(--color-border-soft)] bg-[var(--color-surface-base)] px-2 py-1.5 text-left">
                PLAYER
              </th>
              <th className="stamp-strong sticky top-[41px] z-[var(--z-sticky)] border-b border-[var(--color-border-soft)] bg-[var(--color-surface-base)] px-2 py-1.5 text-left">
                POS · TEAM
              </th>
              {hasBye && (
                <th className="stamp-strong sticky top-[41px] z-[var(--z-sticky)] border-b border-[var(--color-border-soft)] bg-[var(--color-surface-base)] px-2 py-1.5 text-right">
                  BYE
                </th>
              )}
              <th className="stamp-strong sticky top-[41px] z-[var(--z-sticky)] border-b border-[var(--color-border-soft)] bg-[var(--color-surface-base)] px-2 py-1.5 text-right">
                PROJ
              </th>
              <th className="stamp-strong sticky top-[41px] z-[var(--z-sticky)] border-b border-[var(--color-border-soft)] bg-[var(--color-surface-base)] px-2 py-1.5 text-right">
                PAR
              </th>
              <th
                className="stamp-strong sticky top-[41px] z-[var(--z-sticky)] border-b border-[var(--color-border-soft)] bg-[var(--color-surface-base)] px-2 py-1.5 text-right"
                aria-label="log"
              />
            </tr>
          </thead>
          <tbody>
            {rows.map((player, index) => {
              const targeted = targetIds.has(player.id);
              return (
                <tr
                  key={player.id}
                  onClick={() => onLog(player)}
                  title={`log ${player.name} to ${onClockTeamName}`}
                  className="group cursor-pointer border-b border-[var(--color-border-soft)] last:border-b-0 hover:bg-[color:color-mix(in_srgb,var(--color-accent)_8%,transparent)]"
                >
                  <td className="font-data w-10 px-2 py-1 text-xs text-[var(--color-fg-subtle)]">
                    {pad2(index + 1)}
                  </td>
                  <td className="max-w-0 truncate px-2 py-1 text-sm font-semibold text-[var(--color-fg-default)]">
                    {targeted && (
                      <span className="mr-1.5 text-[var(--color-accent)]" title="target">
                        ★
                      </span>
                    )}
                    {player.name}
                  </td>
                  <td className="font-data max-w-28 truncate whitespace-nowrap px-2 py-1 text-xs text-[var(--color-fg-muted)]">
                    {player.pos} · {player.team}
                  </td>
                  {hasBye && (
                    <td className="font-data w-12 px-2 py-1 text-right text-xs text-[var(--color-fg-muted)]">
                      {player.bye ?? "—"}
                    </td>
                  )}
                  <td className="font-data w-16 px-2 py-1 text-right text-sm text-[var(--color-fg-default)]">
                    {Math.round(player.points)}
                  </td>
                  <td
                    className={
                      Math.round(player.par) > 0
                        ? "font-data w-14 px-2 py-1 text-right text-xs text-[var(--color-accent)]"
                        : "font-data w-14 px-2 py-1 text-right text-xs text-[var(--color-fg-muted)]"
                    }
                  >
                    {formatPar(player.par)}
                  </td>
                  <td className="font-data w-14 px-2 py-1 text-right">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onLog(player);
                      }}
                      aria-label={`log ${player.name}`}
                      className="text-[10px] uppercase tracking-[0.1em] text-[var(--color-accent)] opacity-0 focus-visible:opacity-100 group-hover:opacity-100"
                    >
                      + log
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}
