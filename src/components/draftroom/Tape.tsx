"use client";

import { useEffect, useRef } from "react";
import { slotLabel, type TapeCell } from "./model";

/**
 * THE TAPE — full-width horizontal strip of every pick in the draft. The
 * current open cell is enlarged (amber ring; mint when it's mine) and kept
 * centered as picks land. Filled cells show the player; keepers carry a K.
 */
export function Tape({
  cells,
  currentSlotIndex,
}: {
  cells: TapeCell[];
  currentSlotIndex: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  /* Auto-center the current cell on pick changes. Manual scrollLeft math so
     ancestors never scroll vertically. */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const current = container.querySelector<HTMLElement>('[data-current="true"]');
    if (!current) return;
    container.scrollTo({
      left: Math.max(
        0,
        current.offsetLeft - container.clientWidth / 2 + current.offsetWidth / 2,
      ),
      behavior: "smooth",
    });
  }, [currentSlotIndex]);

  return (
    <div
      ref={containerRef}
      className="flex flex-none items-stretch gap-1.5 overflow-x-auto overflow-y-hidden px-4 py-2 [scrollbar-width:thin]"
      aria-label="draft tape — every pick in order"
    >
      {cells.map((cell) => {
        const isCurrent = cell.slotIndex === currentSlotIndex;
        const filled = cell.playerName !== null;

        if (isCurrent) {
          return (
            <div
              key={cell.slotIndex}
              data-current="true"
              className={
                cell.isMine
                  ? "relative flex w-40 flex-none flex-col justify-center gap-0.5 rounded-[var(--radius-sm)] bg-[color:color-mix(in_srgb,var(--color-accent)_12%,transparent)] px-2.5 py-1.5 ring-2 ring-[var(--color-accent)]"
                  : "relative flex w-40 flex-none flex-col justify-center gap-0.5 rounded-[var(--radius-sm)] bg-[color:color-mix(in_srgb,var(--color-warning)_12%,transparent)] px-2.5 py-1.5 ring-2 ring-[var(--color-warning)]"
              }
            >
              <span
                className={
                  cell.isMine
                    ? "pointer-events-none absolute inset-0 animate-pulse rounded-[var(--radius-sm)] ring-2 ring-[var(--color-accent)]"
                    : "pointer-events-none absolute inset-0 animate-pulse rounded-[var(--radius-sm)] ring-2 ring-[var(--color-warning)]"
                }
                aria-hidden="true"
              />
              <span
                className={
                  cell.isMine
                    ? "font-data text-[10px] font-semibold tracking-[0.04em] text-[var(--color-accent)]"
                    : "font-data text-[10px] font-semibold tracking-[0.04em] text-[var(--color-warning)]"
                }
              >
                {slotLabel(cell.round, cell.pickInRound)} · {cell.teamAbbrev}
              </span>
              <span
                className={
                  cell.isMine
                    ? "font-data truncate text-sm font-semibold text-[var(--color-accent)]"
                    : "font-data truncate text-sm font-semibold text-[var(--color-warning)]"
                }
              >
                {cell.isMine ? "YOU" : cell.teamAbbrev}
              </span>
              <span className="stamp">on the clock</span>
            </div>
          );
        }

        const cellClass = filled
          ? "flex w-[4.5rem] flex-none flex-col justify-center gap-0.5 rounded-[var(--radius-sm)] border border-[var(--color-border-soft)] bg-[var(--color-surface-base)] px-1.5 py-1 opacity-70"
          : cell.isMine
            ? "flex w-[4.5rem] flex-none flex-col justify-center gap-0.5 rounded-[var(--radius-sm)] border border-[var(--color-accent)] bg-[var(--color-surface-base)] px-1.5 py-1"
            : "flex w-[4.5rem] flex-none flex-col justify-center gap-0.5 rounded-[var(--radius-sm)] border border-[var(--color-border-soft)] bg-[var(--color-surface-base)] px-1.5 py-1";

        return (
          <div key={cell.slotIndex} className={cellClass}>
            <span
              className={
                cell.isMine
                  ? "font-data whitespace-nowrap text-[9px] tracking-[0.04em] text-[var(--color-accent)]"
                  : "font-data whitespace-nowrap text-[9px] tracking-[0.04em] text-[var(--color-fg-subtle)]"
              }
            >
              {slotLabel(cell.round, cell.pickInRound)} · {cell.teamAbbrev}
              {cell.isKeeper ? (
                <span className="ml-1 font-semibold text-[var(--color-warning)]">K</span>
              ) : null}
            </span>
            <span
              className={
                cell.isMine && !filled
                  ? "font-data truncate text-[10px] text-[var(--color-accent)]"
                  : "font-data truncate text-[10px] text-[var(--color-fg-default)]"
              }
            >
              {cell.playerName ?? (cell.isMine ? "YOU" : "—")}
            </span>
          </div>
        );
      })}
    </div>
  );
}
