"use client";

import { useRef, useState } from "react";
import { NumericInput } from "@/components/NumericInput";
import { normalizeLeagueSettingsDraft } from "@/components/settings/constants";
import { useStore } from "@/store";

type DropEdge = { index: number; side: "before" | "after" } | null;

export function DraftSection() {
  const { leagueSettings, setLeagueSettings } = useStore();
  const teamNameDraftByIndexRef = useRef<Record<number, string>>({});
  const [draggingTeamIndex, setDraggingTeamIndex] = useState<number | null>(null);
  const [dropEdge, setDropEdge] = useState<DropEdge>(null);

  const commitLeagueSettings = (nextNames: string[]) => {
    const next = normalizeLeagueSettingsDraft({
      ...leagueSettings,
      teamNames: nextNames,
      leagueSize: nextNames.length,
    });
    setLeagueSettings(next);
  };

  const handleLeagueSizeCommit = (value: number) => {
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
    if (leagueSettings.teamNames.length >= 20) return;
    const nextNames = [...leagueSettings.teamNames];
    nextNames.splice(index + 1, 0, `Team ${nextNames.length + 1}`);
    commitLeagueSettings(nextNames);
  };

  const handleRemoveTeamAt = (index: number) => {
    if (leagueSettings.teamNames.length <= 2) return;
    const nextNames = leagueSettings.teamNames.filter((_, teamIndex) => teamIndex !== index);
    commitLeagueSettings(nextNames);
  };

  const handleMoveTeamToIndex = (from: number, to: number) => {
    if (from === to) return;
    const nextNames = [...leagueSettings.teamNames];
    const [moved] = nextNames.splice(from, 1);
    nextNames.splice(to, 0, moved);
    commitLeagueSettings(nextNames);
  };

  const updateTeamNameDraft = (index: number, value: string) => {
    const nextNames = [...leagueSettings.teamNames];
    nextNames[index] = value;
    commitLeagueSettings(nextNames);
  };

  const finalizeTeamName = (index: number, value: string) => {
    const nextNames = [...leagueSettings.teamNames];
    nextNames[index] = value.trim().length > 0 ? value.trim() : `Team ${index + 1}`;
    commitLeagueSettings(nextNames);
  };

  const computeDropTarget = (event: React.DragEvent, index: number) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    const side = event.clientY < midpoint ? "before" : "after";
    setDropEdge({ index, side });
  };

  const resolveInsertIndex = (): number | null => {
    if (draggingTeamIndex === null || dropEdge === null) return null;
    const target = dropEdge.side === "before" ? dropEdge.index : dropEdge.index + 1;
    // If dragging from before the target, account for the removal shifting indices
    if (draggingTeamIndex < target) return target - 1;
    if (draggingTeamIndex > target) return target;
    return null; // same position, no-op
  };

  const lineVariant = (index: number, side: "before" | "after"): "active" | "noop" | null => {
    if (draggingTeamIndex === null || dropEdge === null) return null;
    if (dropEdge.side !== side || dropEdge.index !== index) return null;
    // Determine if this edge is a no-op (adjacent to the dragged item)
    if (side === "before" && (index === draggingTeamIndex || index === draggingTeamIndex + 1)) return "noop";
    if (side === "after" && (index === draggingTeamIndex || index === draggingTeamIndex - 1)) return "noop";
    return "active";
  };

  return (
    <div className="font-sans">
      {/* Section header */}
      <div className="mb-8">
        <h2
          className="text-xl font-bold text-[#111111] dark:text-[#e5e5e5]"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          Draft
        </h2>
        <p className="mt-1 text-sm text-[#111111]/60 dark:text-[#e5e5e5]/50">
          Configure league size and team draft order.
        </p>
      </div>

      {/* League size */}
      <div className="mb-8 rounded-lg bg-[#111111]/[0.02] p-4 dark:bg-[#e5e5e5]/[0.03]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#111111]/50 dark:text-[#e5e5e5]/42">
              League Size
            </div>
            <p className="mt-0.5 text-xs text-[#111111]/45 dark:text-[#e5e5e5]/38">
              Shrinking removes trailing teams.
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
          />
        </div>
      </div>

      {/* Team list header */}
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#111111]/50 dark:text-[#e5e5e5]/42">
          Teams ({leagueSettings.teamNames.length})
        </span>
        <span className="text-[10px] text-[#111111]/45 dark:text-[#e5e5e5]/38">
          Drag to reorder
        </span>
      </div>

      {/* Team list */}
      <div className="grid">
        {leagueSettings.teamNames.map((name, index) => (
          <div
            key={`team-${index}`}
            className="relative border-b border-[#111111]/[0.10] last:border-0 dark:border-[#e5e5e5]/[0.08]"
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
            {/* Drop indicator line — before */}
            {lineVariant(index, "before") !== null && (
              <div className="absolute left-6 right-0 top-0 z-10 flex -translate-y-1/2 items-center sm:left-7">
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

            <div
              className={`grid grid-cols-[1.5rem_minmax(0,1fr)] items-center gap-2 py-1 sm:gap-3 ${
                draggingTeamIndex === index ? "opacity-30" : ""
              }`}
            >
              {/* Order number — static, outside the draggable area */}
              <span className="text-center text-xs font-bold tabular-nums text-[#111111]/45 dark:text-[#e5e5e5]/38">
                {index + 1}
              </span>

              {/* Draggable row */}
              <div
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = "move";
                  setDraggingTeamIndex(index);
                }}
                onDragEnd={() => {
                  setDraggingTeamIndex(null);
                  setDropEdge(null);
                }}
                className="group flex items-center gap-2 rounded-lg px-2 py-2 transition-colors hover:bg-[#111111]/[0.02] sm:gap-3 sm:px-3 dark:hover:bg-[#e5e5e5]/[0.02]"
              >
                {/* Drag handle */}
                <span className="flex shrink-0 cursor-grab touch-none select-none rounded p-1.5 text-[#111111]/45 transition-colors hover:bg-[#111111]/[0.05] hover:text-[#111111]/60 active:cursor-grabbing dark:text-[#e5e5e5]/38 dark:hover:bg-[#e5e5e5]/[0.05] dark:hover:text-[#e5e5e5]/55">
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

                {/* Name input */}
                <input
                  key={`team-input-${index}-${name}`}
                  type="text"
                  defaultValue={name}
                  onChange={(event) => {
                    const value = event.target.value;
                    teamNameDraftByIndexRef.current[index] = value;
                    updateTeamNameDraft(index, value);
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
                  className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 py-1 text-sm text-[#111111] transition-colors focus:border-[#111111]/15 focus:bg-white focus:outline-none dark:text-[#e5e5e5] dark:focus:border-[#333333] dark:focus:bg-[#1a1a1a]"
                />

                {/* Actions */}
                <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                  <button
                    type="button"
                    onClick={() => handleAddTeamBelow(index)}
                    disabled={leagueSettings.teamNames.length >= 20}
                    aria-label={`Add team below ${name}`}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[#111111]/45 transition-colors hover:bg-[#111111]/[0.05] hover:text-[#111111]/65 disabled:cursor-not-allowed disabled:opacity-30 dark:text-[#e5e5e5]/38 dark:hover:bg-[#e5e5e5]/[0.05] dark:hover:text-[#e5e5e5]/55"
                  >
                    <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                      <path d="M8 2a.75.75 0 0 1 .75.75v4.5h4.5a.75.75 0 0 1 0 1.5h-4.5v4.5a.75.75 0 0 1-1.5 0v-4.5h-4.5a.75.75 0 0 1 0-1.5h4.5v-4.5A.75.75 0 0 1 8 2Z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveTeamAt(index)}
                    disabled={leagueSettings.teamNames.length <= 2}
                    aria-label={`Remove ${name}`}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[#dc2626]/60 transition-colors hover:bg-[#dc2626]/[0.06] hover:text-[#dc2626] disabled:cursor-not-allowed disabled:opacity-30 dark:text-[#ef4444]/50 dark:hover:bg-[#ef4444]/[0.06] dark:hover:text-[#ef4444]"
                  >
                    <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                      <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Drop indicator line — after */}
            {lineVariant(index, "after") !== null && (
              <div className="absolute bottom-0 left-6 right-0 z-10 flex translate-y-1/2 items-center sm:left-7">
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
        ))}
      </div>
    </div>
  );
}
