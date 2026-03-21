"use client";

import { useState, useRef } from "react";
import { useStore } from "@/store";
import type { League } from "@/types";

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function LeaguesSection() {
  const {
    leagues,
    activeLeagueId,
    setActiveLeague,
    createLeague,
    deleteLeague,
    duplicateLeague,
    renameLeague,
  } = useStore();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const startEditing = (league: League) => {
    setEditingId(league.id);
    setEditValue(league.name);
    setTimeout(() => nameInputRef.current?.select(), 0);
  };

  const commitRename = (id: string) => {
    if (editValue.trim()) {
      renameLeague(id, editValue.trim());
    }
    setEditingId(null);
    setEditValue("");
  };

  const handleCreateLeague = () => {
    createLeague();
  };

  return (
    <div className="font-sans">
      {/* Section header */}
      <div className="mb-8">
        <h2
          className="text-xl font-bold text-[#111111] dark:text-[#e5e5e5]"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          Leagues
        </h2>
        <p className="mt-1 text-sm text-[#111111]/60 dark:text-[#e5e5e5]/50">
          Manage your league profiles. Each league has its own settings and draft state.
        </p>
      </div>

      {/* Create league button */}
      <div className="mb-6">
        <button
          type="button"
          onClick={handleCreateLeague}
          className="rounded-sm bg-[#dc2626] px-4 py-2 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-[#b91c1c] dark:bg-[#ef4444] dark:hover:bg-[#dc2626]"
        >
          Create New League
        </button>
      </div>

      {/* League list */}
      <div className="rounded-lg border border-[#111111]/[0.10] dark:border-[#e5e5e5]/[0.08]">
        {leagues.map((league) => {
          const isActive = league.id === activeLeagueId;
          const isEditing = editingId === league.id;
          const isDeleteConfirm = deleteConfirmId === league.id;

          return (
            <div
              key={league.id}
              className={`border-b border-[#111111]/[0.10] last:border-0 dark:border-[#e5e5e5]/[0.08] ${
                isActive ? "bg-[#dc2626]/[0.02] dark:bg-[#ef4444]/[0.03]" : ""
              }`}
            >
              <div className="flex items-center gap-4 px-4 py-4">
                {/* Active indicator */}
                <div className="shrink-0">
                  {isActive ? (
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#dc2626] dark:bg-[#ef4444]">
                      <svg viewBox="0 0 12 12" fill="none" className="h-3 w-3">
                        <path
                          d="M2 6l3 3 5-5"
                          stroke="white"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setActiveLeague(league.id)}
                      className="flex h-5 w-5 items-center justify-center rounded-full border border-[#111111]/20 dark:border-[#e5e5e5]/20"
                      aria-label={`Activate ${league.name}`}
                    />
                  )}
                </div>

                {/* League info */}
                <div className="min-w-0 flex-1">
                  {isEditing ? (
                    <input
                      ref={nameInputRef}
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => commitRename(league.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitRename(league.id);
                        if (e.key === "Escape") {
                          setEditingId(null);
                          setEditValue("");
                        }
                      }}
                      className="w-full rounded-md border border-[#111111]/15 bg-white px-2 py-1 text-sm text-[#111111] focus:border-[#dc2626] focus:outline-none dark:border-[#333333] dark:bg-[#1a1a1a] dark:text-[#e5e5e5] dark:focus:border-[#ef4444]"
                      aria-label="League name"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => startEditing(league)}
                      className="text-left text-sm font-medium text-[#111111] hover:text-[#dc2626] dark:text-[#e5e5e5] dark:hover:text-[#ef4444]"
                    >
                      {league.name}
                    </button>
                  )}
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-[#111111]/50 dark:text-[#e5e5e5]/40">
                    <span>{league.leagueSettings.leagueSize} teams</span>
                    <span className="text-[#111111]/20 dark:text-[#e5e5e5]/15">|</span>
                    <span>Updated {formatDate(league.updatedAt)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => duplicateLeague(league.id)}
                    className="rounded-sm px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-[#111111]/60 hover:bg-[#111111]/[0.05] dark:text-[#e5e5e5]/50 dark:hover:bg-[#e5e5e5]/[0.05]"
                    title="Duplicate league"
                  >
                    Duplicate
                  </button>
                  {isDeleteConfirm ? (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => deleteLeague(league.id)}
                        className="rounded-sm px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-[#dc2626] hover:bg-red-50 dark:text-[#ef4444] dark:hover:bg-red-950/30"
                      >
                        Delete
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(null)}
                        className="rounded-sm px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-[#111111]/60 hover:bg-[#111111]/[0.05] dark:text-[#e5e5e5]/50 dark:hover:bg-[#e5e5e5]/[0.05]"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(league.id)}
                      className="rounded-sm px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-[#dc2626]/60 hover:bg-red-50 dark:text-[#ef4444]/50 dark:hover:bg-red-950/30"
                      title="Delete league"
                      disabled={leagues.length <= 1}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>

              {/* Delete confirmation warning */}
              {isDeleteConfirm && (
                <div className="border-t border-[#dc2626]/20 px-4 py-3 dark:border-[#ef4444]/20">
                  <p className="text-xs text-[#dc2626] dark:text-[#ef4444]">
                    This will delete{" "}
                    <strong>{league.name}</strong> and all its draft state. This cannot be undone.
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Help text */}
      <p className="mt-4 text-xs text-[#111111]/45 dark:text-[#e5e5e5]/38">
        Click a league name to rename it. Select the checkmark to activate a league.
        Each league maintains its own scoring settings, roster configuration, and draft state.
      </p>
    </div>
  );
}
