"use client";

import { useRef, useState } from "react";
import { NumericInput } from "@/components/NumericInput";
import { normalizeLeagueSettingsDraft } from "@/components/settings/constants";
import { useStore } from "@/store";

export function DraftSection() {
  const { leagueSettings, setLeagueSettings } = useStore();
  const teamNameDraftByIndexRef = useRef<Record<number, string>>({});
  const [draggingTeamIndex, setDraggingTeamIndex] = useState<number | null>(null);
  const [dragOverTeamIndex, setDragOverTeamIndex] = useState<number | null>(null);

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

  return (
    <div className="font-sans">
      <div className="mb-6 border-b border-[#111111]/10 pb-5 dark:border-[#333333]">
        <h2
          className="text-xl font-bold text-[#111111] dark:text-[#e5e5e5]"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          Draft
        </h2>
        <p className="mt-1 text-sm text-[#111111]/55 dark:text-[#e5e5e5]/45">
          Configure league size and team draft order.
        </p>
      </div>

      <div className="mb-6 rounded-sm border border-[#111111]/10 p-4 dark:border-[#333333]">
        <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#111111]/50 dark:text-[#e5e5e5]/40">
          League Size
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
        <p className="mt-2 text-xs text-[#111111]/40 dark:text-[#e5e5e5]/35">
          Shrinking removes trailing teams and prunes draft assignments beyond the new size.
        </p>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <span
          className="text-[10px] font-bold uppercase tracking-widest text-[#111111]/50 dark:text-[#e5e5e5]/40"
          style={{ fontVariant: "small-caps" }}
        >
          Teams ({leagueSettings.teamNames.length})
        </span>
        <span className="text-[10px] text-[#111111]/30 dark:text-[#e5e5e5]/20">
          Order here sets draft order
        </span>
      </div>

      <div className="grid gap-2">
        {leagueSettings.teamNames.map((name, index) => (
          <div key={`team-${index}`} className="flex flex-wrap items-center gap-3">
            <span className="w-10 text-xs font-bold text-[#111111]/40 dark:text-[#e5e5e5]/30">
              T{index + 1}
            </span>
            <div
              draggable
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = "move";
                setDraggingTeamIndex(index);
              }}
              onDragEnd={() => {
                setDraggingTeamIndex(null);
                setDragOverTeamIndex(null);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                if (dragOverTeamIndex !== index) {
                  setDragOverTeamIndex(index);
                }
              }}
              onDrop={(event) => {
                event.preventDefault();
                if (draggingTeamIndex === null) return;
                handleMoveTeamToIndex(draggingTeamIndex, index);
                setDraggingTeamIndex(null);
                setDragOverTeamIndex(null);
              }}
              className={`flex flex-1 flex-wrap items-center gap-2 border-b px-2 py-2 ${
                dragOverTeamIndex === index
                  ? "border-[#dc2626] bg-[#dc2626]/5 dark:border-[#ef4444] dark:bg-[#ef4444]/5"
                  : "border-[#111111]/10 dark:border-[#333333]"
              } ${draggingTeamIndex === index ? "opacity-40" : ""}`}
            >
              <span className="cursor-grab select-none text-xs text-[#111111]/30 dark:text-[#e5e5e5]/20">
                :::
              </span>
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
                className="min-w-[160px] flex-1 rounded-sm border border-[#111111]/20 bg-white px-2 py-1 text-sm text-[#111111] focus:border-[#dc2626] focus:outline-none dark:border-[#333333] dark:bg-[#1a1a1a] dark:text-[#e5e5e5] dark:focus:border-[#ef4444]"
              />
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleAddTeamBelow(index)}
                disabled={leagueSettings.teamNames.length >= 20}
                className="text-[10px] font-bold uppercase tracking-widest text-[#111111]/40 hover:text-[#111111] disabled:cursor-not-allowed disabled:opacity-30 dark:text-[#e5e5e5]/30 dark:hover:text-[#e5e5e5]"
              >
                Add Below
              </button>
              <button
                type="button"
                onClick={() => handleRemoveTeamAt(index)}
                disabled={leagueSettings.teamNames.length <= 2}
                className="text-[10px] font-bold uppercase tracking-widest text-[#dc2626] hover:underline disabled:cursor-not-allowed disabled:opacity-30 dark:text-[#ef4444]"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
