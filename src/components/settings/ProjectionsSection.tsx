"use client";

import { useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { runProjectionEligibilityImport } from "@/lib/projectionEligibilityImport";
import {
  getProjectionGroupDisplayName,
  getProjectionGroupPlayerCounts,
  getProjectionGroupSourceLabel,
} from "@/lib/projectionGroups";
import { Button } from "@/components/ui/Button";
import { useStore } from "@/store";

interface ProjectionsSectionProps {
  onOpenUpload: () => void;
}

function formatImportedAt(timestamp?: string): string | null {
  if (!timestamp) return null;
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function ProjectionsSection({ onOpenUpload }: ProjectionsSectionProps) {
  const {
    projectionGroups,
    activeProjectionGroupId,
    setActiveProjectionGroup,
    renameProjectionGroup,
    removeProjectionGroup,
    setProjectionGroupEligibilityImportSeason,
    applyEligibilityForGroup,
  } = useStore(
    useShallow((state) => ({
      projectionGroups: state.projectionGroups,
      activeProjectionGroupId: state.activeProjectionGroupId,
      setActiveProjectionGroup: state.setActiveProjectionGroup,
      renameProjectionGroup: state.renameProjectionGroup,
      removeProjectionGroup: state.removeProjectionGroup,
      setProjectionGroupEligibilityImportSeason: state.setProjectionGroupEligibilityImportSeason,
      applyEligibilityForGroup: state.applyEligibilityForGroup,
    }))
  );
  const [renameDrafts, setRenameDrafts] = useState<Record<string, string>>({});
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [activeImportGroupId, setActiveImportGroupId] = useState<string | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const [importPlayer, setImportPlayer] = useState("");
  const [retryStatus, setRetryStatus] = useState<string | null>(null);
  const [importError, setImportError] = useState<{ groupId: string; message: string } | null>(
    null
  );

  const activeGroup =
    projectionGroups.find((group) => group.id === activeProjectionGroupId) ??
    projectionGroups[0] ??
    null;

  const projectionGroupsWithCounts = useMemo(
    () =>
      projectionGroups.map((group) => ({
        group,
        counts: getProjectionGroupPlayerCounts(group),
        isActive: group.id === activeGroup?.id,
        importedAtLabel: formatImportedAt(group.eligibilityImportedAt),
      })),
    [activeGroup?.id, projectionGroups]
  );

  const handleEligibilityImport = async (groupId: string) => {
    const group = projectionGroups.find((item) => item.id === groupId);
    if (!group) return;

    await runProjectionEligibilityImport({
      group,
      season: group.eligibilityImportSeason ?? 2025,
      applyEligibilityForGroup,
      callbacks: {
        onStart: () => {
          setActiveImportGroupId(group.id);
          setImportProgress(0);
          setImportPlayer("");
          setRetryStatus(null);
          setImportError(null);
        },
        onProgress: setImportProgress,
        onPlayer: setImportPlayer,
        onRetryStatus: setRetryStatus,
        onError: (message) => {
          if (message) {
            setImportError({ groupId: group.id, message });
          }
        },
        onComplete: () => {
          setActiveImportGroupId(null);
        },
      },
    });
  };

  return (
    <div className="font-sans">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2
            className="text-xl font-bold text-[#111111] dark:text-[#e5e5e5]"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            Projections
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-[#111111]/60 dark:text-[#e5e5e5]/50">
            Select the active dataset, upload new projection groups, and import position eligibility.
            Projection groups are shared across all leagues.
          </p>
        </div>
        <Button variant="primary" size="md" onClick={onOpenUpload}>
          Upload Projections
        </Button>
      </div>

      <div className="grid gap-4">
        {projectionGroupsWithCounts.map(({ group, counts, isActive, importedAtLabel }) => {
          const isBuiltIn = group.source.kind === "public-dataset";
          const isImporting = activeImportGroupId === group.id;
          const sourceLabel = getProjectionGroupSourceLabel(group);
          const renameValue = renameDrafts[group.id] ?? group.name;
          const importSeason = group.eligibilityImportSeason ?? 2025;

          return (
            <section
              key={group.id}
              className="rounded-lg border border-[#111111]/10 bg-white p-5 shadow-sm dark:border-[#333333] dark:bg-[#111111]"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3
                      className="text-lg font-bold text-[#111111] dark:text-[#e5e5e5]"
                      style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                    >
                      {getProjectionGroupDisplayName(group)}
                    </h3>
                    <span className="rounded-full bg-[#111111]/[0.05] px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-[#111111]/60 dark:bg-[#e5e5e5]/[0.06] dark:text-[#e5e5e5]/55">
                      {sourceLabel}
                    </span>
                    {isActive ? (
                      <span className="rounded-full bg-[#dc2626]/[0.08] px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-[#dc2626] dark:bg-[#ef4444]/[0.08] dark:text-[#ef4444]">
                        Active
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-4 text-xs text-[#111111]/55 dark:text-[#e5e5e5]/45">
                    <span>{counts.batters} batters</span>
                    <span>{counts.pitchers} pitchers</span>
                    <span>{counts.twoWayPlayers} two-way</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    size="sm"
                    disabled={isActive}
                    onClick={() => setActiveProjectionGroup(group.id)}
                  >
                    {isActive ? "Active" : "Use"}
                  </Button>
                </div>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
                <div className="space-y-3">
                  {!isBuiltIn ? (
                    <>
                      <div className="rounded-md bg-[#111111]/[0.03] p-3 dark:bg-[#e5e5e5]/[0.04]">
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-[#111111]/45 dark:text-[#e5e5e5]/40">
                          Rename Projection Group
                        </label>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <input
                            type="text"
                            value={renameValue}
                            onChange={(event) =>
                              setRenameDrafts((current) => ({
                                ...current,
                                [group.id]: event.target.value,
                              }))
                            }
                            className="min-w-[220px] flex-1 rounded-sm border border-[#111111]/15 bg-white px-3 py-2 text-sm text-[#111111] focus:border-[#dc2626] focus:outline-none dark:border-[#333333] dark:bg-[#1a1a1a] dark:text-[#e5e5e5] dark:focus:border-[#ef4444]"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => renameProjectionGroup(group.id, renameValue)}
                          >
                            Save Name
                          </Button>
                        </div>
                      </div>

                      <div className="rounded-md border border-[#dc2626]/20 bg-[#dc2626]/[0.03] p-3 dark:border-[#ef4444]/25 dark:bg-[#ef4444]/[0.05]">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-[#991b1b] dark:text-[#fca5a5]">
                          Delete Projection Group
                        </div>
                        <p className="mt-2 text-sm text-[#7f1d1d] dark:text-[#fecaca]">
                          Remove this uploaded group from the app. Built-in leaders stay protected
                          and are not affected.
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <Button
                            variant={
                              deleteConfirmId === group.id ? "destructive" : "destructiveGhost"
                            }
                            size="sm"
                            onClick={() => {
                              if (deleteConfirmId === group.id) {
                                removeProjectionGroup(group.id);
                                setDeleteConfirmId(null);
                                return;
                              }
                              setDeleteConfirmId(group.id);
                            }}
                          >
                            {deleteConfirmId === group.id ? "Confirm Delete" : "Delete Group"}
                          </Button>
                          <span className="text-xs text-[#7f1d1d]/80 dark:text-[#fecaca]/80">
                            Deletion removes the dataset from every league view.
                          </span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="rounded-md bg-[#111111]/[0.03] p-3 text-sm text-[#111111]/60 dark:bg-[#e5e5e5]/[0.04] dark:text-[#e5e5e5]/50">
                      Built-in datasets stay protected, but you can still import or re-run eligibility.
                    </div>
                  )}

                  <div className="rounded-md bg-[#111111]/[0.03] p-3 dark:bg-[#e5e5e5]/[0.04]">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-[#111111]/45 dark:text-[#e5e5e5]/40">
                      Eligibility Status
                    </div>
                    <div className="mt-2 space-y-1 text-sm text-[#111111]/70 dark:text-[#e5e5e5]/60">
                      {group.eligibilityImportedAt ? (
                        <>
                          <div>Imported for season {group.eligibilitySeason ?? importSeason}.</div>
                          {importedAtLabel ? <div>Last run: {importedAtLabel}.</div> : null}
                        </>
                      ) : (
                        <div>Eligibility has not been imported yet.</div>
                      )}
                      <div>Next run season: {importSeason}.</div>
                    </div>
                    {importError?.groupId === group.id ? (
                      <p className="mt-2 text-sm text-[#b45309] dark:text-[#f59e0b]">
                        {importError.message}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-md border border-[#111111]/10 p-4 dark:border-[#333333]">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#111111]/45 dark:text-[#e5e5e5]/40">
                    Eligibility Season
                  </label>
                  <input
                    type="number"
                    defaultValue={importSeason}
                    min={1900}
                    step={1}
                    onBlur={(event) => {
                      const parsed = Number(event.target.value);
                      if (Number.isFinite(parsed) && parsed > 0) {
                        setProjectionGroupEligibilityImportSeason(group.id, parsed);
                      }
                    }}
                    className="mt-2 w-full rounded-sm border border-[#111111]/15 bg-white px-3 py-2 text-sm text-[#111111] focus:border-[#dc2626] focus:outline-none dark:border-[#333333] dark:bg-[#1a1a1a] dark:text-[#e5e5e5] dark:focus:border-[#ef4444]"
                    aria-label={`Eligibility season for ${getProjectionGroupDisplayName(group)}`}
                  />

                  <Button
                    variant="primary"
                    size="md"
                    className="mt-3 w-full"
                    disabled={activeImportGroupId !== null}
                    onClick={() => void handleEligibilityImport(group.id)}
                  >
                    {group.eligibilityImportedAt ? "Re-run Eligibility" : "Import Eligibility"}
                  </Button>

                  {isImporting ? (
                    <div className="mt-3 space-y-1 text-sm text-[#111111]/60 dark:text-[#e5e5e5]/50">
                      <div>{importProgress}% complete</div>
                      {importPlayer ? <div>Current player: {importPlayer}</div> : null}
                      {retryStatus ? <div>{retryStatus}</div> : null}
                    </div>
                  ) : null}
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
