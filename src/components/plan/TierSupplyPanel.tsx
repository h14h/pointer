"use client";

import { useMemo } from "react";
import { LedgerRow } from "@/components/ui/LedgerRow";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { summarizeTierSupply, type TierSupplyRow } from "@/lib/tiers";
import type { Sport } from "@/types";
import type { PlanPlayer } from "./planData";

const FOOTBALL_SUPPLY_GROUPS = ["QB", "RB", "WR", "TE"];
const BASEBALL_SUPPLY_GROUPS = ["Batters", "Pitchers"];

/** Show at most this many tiers per group — the rest is replacement level. */
const MAX_DISPLAYED_TIERS = 4;

function TierBar({ row }: { row: TierSupplyRow }) {
  const ratio = row.total > 0 ? row.remaining / row.total : 0;
  const isLow = ratio <= 0.25;
  return (
    <div className="h-2 border border-[var(--color-border-soft)] bg-[var(--color-surface-raised)]">
      <span
        className="block h-full"
        style={{
          width: `${Math.round(ratio * 100)}%`,
          backgroundColor: isLow
            ? "var(--color-warning)"
            : "var(--color-accent)",
        }}
      />
    </div>
  );
}

/**
 * The tier-supply rail: natural-gap tiers per position group (football) or
 * per Batters/Pitchers (baseball), with remaining-vs-printed bars.
 */
export function TierSupplyPanel({
  players,
  sport,
}: {
  players: PlanPlayer[];
  sport: Sport;
}) {
  const groups = useMemo(() => {
    const labels =
      sport === "football" ? FOOTBALL_SUPPLY_GROUPS : BASEBALL_SUPPLY_GROUPS;
    return labels
      .map((label) => {
        const members = players.filter((player) => player.supplyGroup === label);
        const rows = summarizeTierSupply(
          members.map((player) => ({
            id: player.id,
            points: player.points,
            available: player.available,
          }))
        ).slice(0, MAX_DISPLAYED_TIERS);
        return { label, rows };
      })
      .filter((group) => group.rows.length > 0);
  }, [players, sport]);

  return (
    <Panel as="section" padding="none">
      <PanelHeader
        title="Tier supply"
        right={<span className="stamp">remaining vs. printed pool</span>}
      />

      {groups.length === 0 ? (
        <p className="px-4 py-3.5 text-[12.5px] text-[var(--color-fg-muted)]">
          the supply report prints once the projection pool has players.
        </p>
      ) : (
        groups.map((group) => (
          <LedgerRow key={group.label} className="block pb-3.5 pt-3">
            <div className="font-data mb-2 text-xs font-semibold tracking-[0.08em] text-[var(--color-fg-default)]">
              {group.label}
            </div>
            {group.rows.map((row) => (
              <div
                key={row.tier}
                className="mb-1.5 grid grid-cols-[28px_1fr_64px] items-center gap-2.5 last:mb-0"
              >
                <span className="stamp">T{row.tier}</span>
                <TierBar row={row} />
                <span className="font-data text-right text-[11px] text-[var(--color-fg-muted)]">
                  {row.remaining} of {row.total}
                </span>
              </div>
            ))}
          </LedgerRow>
        ))
      )}
    </Panel>
  );
}
