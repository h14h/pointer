"use client";

import { useState } from "react";
import { useStore } from "@/store";

interface HeaderProps {
  onOpenUpload: () => void;
  onOpenScoring: () => void;
}

export function Header({ onOpenUpload, onOpenScoring }: HeaderProps) {
  const {
    isDraftMode,
    setDraftMode,
    projectionGroups,
    activeProjectionGroupId,
    draftState,
    resetDraft,
    clearAllData,
  } = useStore();
  const [isClearOpen, setIsClearOpen] = useState(false);

  const activeGroup =
    projectionGroups.find((group) => group.id === activeProjectionGroupId) ??
    projectionGroups[0] ??
    null;
  const batters = activeGroup?.batters ?? [];
  const pitchers = activeGroup?.pitchers ?? [];
  const twoWayPlayers = activeGroup?.twoWayPlayers ?? [];
  const draftedCount = draftState.draftedIds.length;
  const keeperCount = draftState.keeperIds.length;

  return (
    <>
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
              Pointer
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsClearOpen(true)}
              className="rounded-md bg-red-100 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/40"
            >
              Delete Projections
            </button>
            <button
              onClick={onOpenUpload}
              className="rounded-md bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              Upload Projections
            </button>

            <button
              onClick={onOpenScoring}
              className="rounded-md bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              Scoring
            </button>

            <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-700" />

            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                Draft Mode
              </span>
              <button
                role="switch"
                aria-checked={isDraftMode}
                onClick={() => setDraftMode(!isDraftMode)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isDraftMode
                    ? "bg-emerald-500"
                    : "bg-zinc-300 dark:bg-zinc-600"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isDraftMode ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </label>

            {isDraftMode && (
              <>
                <span className="text-sm text-zinc-500">
                  {draftedCount} drafted
                  {keeperCount > 0 && `, ${keeperCount} keepers`}
                </span>
                <button
                  onClick={() => {
                    if (confirm("Reset all draft picks?")) {
                      resetDraft();
                    }
                  }}
                  className="rounded-md px-2 py-1 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  Reset
                </button>
              </>
            )}
          </div>
        </div>
      </header>
      {isClearOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-zinc-900">
            <h2 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Delete all projections?
            </h2>
            <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
              This removes all projection groups and uploaded players. This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsClearOpen(false)}
                className="rounded-md px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  clearAllData();
                  setIsClearOpen(false);
                }}
                className="rounded-md bg-red-100 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/40"
              >
                Delete Projections
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
