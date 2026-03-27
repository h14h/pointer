"use client";

import { useState, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/Panel";
import { SectionHeader } from "@/components/ui/SectionHeader";
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
      <SectionHeader
        className="mb-8"
        title="Leagues"
        description="Manage your league profiles. Each league has its own settings and draft state."
      />

      {/* Create league button */}
      <div className="mb-6">
        <Button variant="primary" onClick={handleCreateLeague}>
          Create New League
        </Button>
      </div>

      {/* League list */}
      <Panel tone="default" padding="none" className="overflow-hidden rounded-lg">
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
                    <Input
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
                      inputSize="sm"
                      className="w-full px-2 py-1"
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
                    <Badge variant="neutral">{league.leagueSettings.leagueSize} teams</Badge>
                    <span className="text-[#111111]/20 dark:text-[#e5e5e5]/15">|</span>
                    <span>Updated {formatDate(league.updatedAt)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => duplicateLeague(league.id)}
                    className="text-[11px]"
                    title="Duplicate league"
                  >
                    Duplicate
                  </Button>
                  {isDeleteConfirm ? (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="destructiveGhost"
                        size="sm"
                        onClick={() => deleteLeague(league.id)}
                        className="text-[11px]"
                      >
                        Delete
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteConfirmId(null)}
                        className="text-[11px]"
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="destructiveGhost"
                      size="sm"
                      onClick={() => setDeleteConfirmId(league.id)}
                      className="text-[11px] opacity-60 enabled:opacity-100"
                      title="Delete league"
                      disabled={leagues.length <= 1}
                    >
                      Delete
                    </Button>
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
      </Panel>

      {/* Help text */}
      <p className="mt-4 text-xs text-[#111111]/45 dark:text-[#e5e5e5]/38">
        Click a league name to rename it. Select the checkmark to activate a league.
        Each league maintains its own scoring settings, roster configuration, and draft state.
      </p>
    </div>
  );
}
