"use client";

import { useMemo, type MouseEvent } from "react";
import { AppDialog } from "@/components/ui/AppDialog";
import { Button } from "@/components/ui/Button";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { Input } from "@/components/ui/input";
import {
  FOOTBALL_OVERRIDE_STAT_LABELS,
  FOOTBALL_OVERRIDE_STATS,
  type FootballOverrideStat,
} from "@/lib/overrides";
import type { FootballPlayer, PlayerStatOverride } from "@/types";

type OverrideEditorProps = {
  player: FootballPlayer | null;
  override: PlayerStatOverride | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChangeStat: (stat: FootballOverrideStat, value: number | null) => void;
};

function parseStatInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
}

export function OverrideEditor({
  player,
  override,
  open,
  onOpenChange,
  onChangeStat,
}: OverrideEditorProps) {
  const fields = useMemo(() => {
    if (!player) return [];
    return FOOTBALL_OVERRIDE_STATS.map((stat) => ({
      stat,
      label: FOOTBALL_OVERRIDE_STAT_LABELS[stat],
      uploaded: player[stat],
      overridden: override?.[stat],
    }));
  }, [player, override]);

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={player ? player.Name : "Override"}
      description="Replace uploaded projections for ranking-moving stats. Leave a field blank to use the upload."
      footer={
        <Button type="button" variant="toolbar" size="sm" onClick={() => onOpenChange(false)}>
          Done
        </Button>
      }
    >
      {player ? (
        <div className="mt-4 grid grid-cols-2 gap-3">
          {fields.map((field) => (
            <label key={field.stat} className="flex flex-col gap-1">
              <FieldLabel>
                {field.label}
                {field.overridden !== undefined ? " · overlay" : ""}
              </FieldLabel>
              <Input
                inputSize="sm"
                inputMode="decimal"
                defaultValue={
                  field.overridden !== undefined ? String(field.overridden) : String(field.uploaded)
                }
                key={`${player._id}-${field.stat}-${field.overridden ?? "upload"}`}
                onBlur={(event) => {
                  const next = parseStatInput(event.target.value);
                  const uploaded = field.uploaded;
                  if (next === null || next === uploaded) {
                    onChangeStat(field.stat, null);
                    return;
                  }
                  onChangeStat(field.stat, next);
                }}
              />
            </label>
          ))}
        </div>
      ) : null}
    </AppDialog>
  );
}

export function OverrideTrigger({
  hasOverrides,
  onClick,
}: {
  hasOverrides: boolean;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
  if (!hasOverrides) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      className="font-data shrink-0 rounded-sm px-1.5 py-0.5 text-[9px] uppercase tracking-[0.08em] bg-[color:color-mix(in_srgb,var(--color-accent)_16%,transparent)] text-[var(--color-accent)]"
      aria-label="Overridden projections — edit overlay"
    >
      OV
    </button>
  );
}
