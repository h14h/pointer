"use client";

import { Chip } from "@/components/ui/Chip";
import { Input } from "@/components/ui/input";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { cn } from "@/lib/utils";
import type { RoundSlot, RoundSlotStatus } from "./planData";

const pad2 = (n: number) => String(n).padStart(2, "0");

function StatusChip({ status }: { status: RoundSlotStatus }) {
  const label =
    status === "logged"
      ? "logged"
      : status === "keeper"
        ? "keeper"
        : status === "ondeck"
          ? "on deck"
          : "projected";
  const tone =
    status === "logged"
      ? "accent"
      : status === "keeper" || status === "ondeck"
        ? "warning"
        : "neutral";
  return <Chip tone={tone}>{label}</Chip>;
}

function RailDot({ status }: { status: RoundSlotStatus }) {
  return (
    <span
      className={cn(
        "relative z-10 mt-4 size-2.5 rounded-full border-[1.5px]",
        status === "logged" || status === "keeper"
          ? "border-[var(--color-accent)] bg-[var(--color-accent)]"
          : status === "ondeck"
            ? "border-[var(--color-warning)] bg-[color:color-mix(in_srgb,var(--color-warning)_12%,transparent)]"
            : "border-[var(--color-fg-muted)] bg-[var(--color-surface-base)]"
      )}
    />
  );
}

function SlotBody({ slot }: { slot: RoundSlot }) {
  if (slot.status === "logged" || slot.status === "keeper") {
    const name = slot.player?.name ?? slot.playerId ?? "unknown player";
    return (
      <div className="mt-1.5 text-[15px] font-semibold text-[var(--color-accent)]">
        {name}
        {slot.player ? (
          <span className="font-data ml-2 text-[10px] font-normal tracking-[0.05em] text-[var(--color-fg-muted)]">
            {slot.player.pos} · {slot.player.team} ·{" "}
            {Math.round(slot.player.points)} pts
          </span>
        ) : null}
      </div>
    );
  }

  if (slot.status === "ondeck") {
    return (
      <p className="font-data mt-1.5 text-[10.5px] leading-relaxed tracking-[0.02em] text-[var(--color-fg-muted)]">
        begin draft night to log this slot. top of board:{" "}
        {slot.topOfBoard.length > 0
          ? slot.topOfBoard.map((player) => player.name).join(" · ")
          : "—"}
      </p>
    );
  }

  return (
    <p className="font-data mt-1.5 text-[10.5px] leading-relaxed tracking-[0.02em] text-[var(--color-fg-muted)]">
      likely on board:{" "}
      {slot.likely.length > 0
        ? slot.likely.map((player, index) => (
            <span key={player.id}>
              {index > 0 && " · "}
              <span className="text-[var(--color-accent)] underline decoration-[var(--color-border-default)] underline-offset-2">
                {player.name} {player.pos}
              </span>
            </span>
          ))
        : "—"}
    </p>
  );
}

/**
 * The pick timeline: one row per round of my team's draft, with status,
 * likely board state, and a per-slot strategy note saved on blur.
 */
export function PickTimeline({
  slots,
  noteByRound,
  onSaveNote,
}: {
  slots: RoundSlot[];
  noteByRound: Record<string, string>;
  onSaveNote: (round: number, note: string) => void;
}) {
  const summary = slots
    .slice(0, 5)
    .map((slot) => slot.overall)
    .join(" / ");

  return (
    <Panel as="section" padding="none">
      <PanelHeader
        title="Pick timeline — your slots"
        right={
          <span className="stamp font-data">
            picks {summary}
            {slots.length > 5 ? " …" : ""}
          </span>
        }
      />

      <div className="py-1">
        {slots.map((slot, index) => {
          const isFirst = index === 0;
          const isLast = index === slots.length - 1;
          return (
            <div
              key={slot.round}
              className="grid grid-cols-[18px_minmax(0,1fr)] gap-3 px-4"
            >
              <div className="relative flex justify-center">
                <span
                  className={cn(
                    "absolute left-1/2 w-px -translate-x-1/2 bg-[var(--color-border-soft)]",
                    isFirst ? "top-4" : "top-0",
                    isLast ? "h-4" : "bottom-0"
                  )}
                />
                <RailDot status={slot.status} />
              </div>

              <div
                className={cn(
                  "min-w-0 py-3",
                  !isLast && "border-b border-[var(--color-border-soft)]"
                )}
              >
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="font-data text-[13px] font-semibold text-[var(--color-fg-default)]">
                    R{slot.round}.{pad2(slot.pickInRound)}
                  </span>
                  <span className="stamp font-data">
                    p{slot.overall} overall
                  </span>
                  <StatusChip status={slot.status} />
                </div>

                <SlotBody slot={slot} />

                <div className="mt-2">
                  <Input
                    tone="underline"
                    inputSize="sm"
                    type="text"
                    defaultValue={noteByRound[String(slot.round)] ?? ""}
                    onBlur={(event) => onSaveNote(slot.round, event.target.value)}
                    placeholder="slot note — pivots, fallbacks, a position to force"
                    aria-label={`Round ${slot.round} note`}
                    className="font-data text-xs"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
