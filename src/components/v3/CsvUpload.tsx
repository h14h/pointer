"use client";

import { useState, useCallback } from "react";
import {
  parsePlayerCSV,
  mergePlayers,
  type ParseResult,
  type IdConfig,
} from "@/lib/csvParser";
import {
  computeHitterEligibility,
  computePitcherEligibility,
  emptyPositionGames,
  eligibilityFromProfilePosition,
  mergeTwoWayEligibility,
  mergeWarnings,
} from "@/lib/eligibility";
import { fetchSeasonStatsForPlayers } from "@/lib/mlbStatsApi";
import { useStore } from "@/store";
import type {
  TwoWayPlayer,
  IdSource,
  ProjectionGroup,
  Player,
  Eligibility,
} from "@/types";

interface CsvUploadProps {
  isOpen: boolean;
  onClose: () => void;
}

type UploadType = "auto" | "batter" | "pitcher";

type UploadFileState = {
  file: File;
  content: string;
  parseResult: ParseResult;
  selectedIdSource: IdSource | "custom";
  customIdColumn: string;
};

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}

function suggestGroupName(fileName: string | undefined, groupCount: number) {
  if (fileName) {
    const trimmed = fileName.trim();
    if (trimmed.length > 0) {
      return trimmed.replace(/\.[^/.]+$/, "");
    }
  }
  return `Methodology ${groupCount + 1}`;
}

export function CsvUpload({ isOpen, onClose }: CsvUploadProps) {
  const { projectionGroups, addProjectionGroup, applyEligibilityForGroup } = useStore();
  const [dragActive, setDragActive] = useState(false);
  const [uploadType, setUploadType] = useState<UploadType>("auto");
  const [groupName, setGroupName] = useState("");
  const [groupNameTouched, setGroupNameTouched] = useState(false);
  const [batterFile, setBatterFile] = useState<UploadFileState | null>(null);
  const [pitcherFile, setPitcherFile] = useState<UploadFileState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importEligibilityEnabled, setImportEligibilityEnabled] = useState(false);
  const [isImportingEligibility, setIsImportingEligibility] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importPlayer, setImportPlayer] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [retryStatus, setRetryStatus] = useState<string | null>(null);
  const [importTargetGroup, setImportTargetGroup] = useState<ProjectionGroup | null>(
    null
  );

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      if (fileArray.length === 0) return;

      setError(null);

      try {
        const contents = await Promise.all(fileArray.map((file) => readFile(file)));
        const forceType = uploadType === "auto" ? undefined : uploadType;

        let nextBatter: UploadFileState | null = null;
        let nextPitcher: UploadFileState | null = null;

        for (let i = 0; i < fileArray.length; i += 1) {
          const file = fileArray[i];
          const content = contents[i];
          const result = parsePlayerCSV(content, forceType);

          const fileState: UploadFileState = {
            file,
            content,
            parseResult: result,
            selectedIdSource: "generated",
            customIdColumn: result.availableColumns[0] ?? "",
          };

          if (result.type === "batter") {
            if (nextBatter) {
              setError("Only one batter file is allowed per upload.");
              return;
            }
            nextBatter = fileState;
          } else {
            if (nextPitcher) {
              setError("Only one pitcher file is allowed per upload.");
              return;
            }
            nextPitcher = fileState;
          }
        }

        if (!groupNameTouched) {
          setGroupName(suggestGroupName(fileArray[0]?.name, projectionGroups.length));
        }

        setBatterFile(nextBatter);
        setPitcherFile(nextPitcher);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to read files");
      }
    },
    [uploadType, groupNameTouched, projectionGroups.length]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      if (e.dataTransfer.files.length > 0) {
        void handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        void handleFiles(files);
      }
    },
    [handleFiles]
  );

  const needsIdSelection =
    batterFile?.parseResult.needsIdSelection || pitcherFile?.parseResult.needsIdSelection;

  const handleIdSelection = useCallback(() => {
    const forceType = uploadType === "auto" ? undefined : uploadType;

    const reparseFile = (fileState: UploadFileState) => {
      const idConfig: IdConfig =
        fileState.selectedIdSource === "custom"
          ? { source: "custom", customColumn: fileState.customIdColumn }
          : { source: fileState.selectedIdSource };
      const result = parsePlayerCSV(
        fileState.content,
        forceType ?? fileState.parseResult.type,
        idConfig
      );
      return { ...fileState, parseResult: result };
    };

    if (batterFile?.parseResult.needsIdSelection) {
      setBatterFile(reparseFile(batterFile));
    }
    if (pitcherFile?.parseResult.needsIdSelection) {
      setPitcherFile(reparseFile(pitcherFile));
    }
  }, [batterFile, pitcherFile, uploadType]);

  const runEligibilityImport = useCallback(
    async (group: ProjectionGroup) => {
      const season = 2025;
      const batters = group.batters ?? [];
      const pitchers = group.pitchers ?? [];
      const twoWayPlayers = group.twoWayPlayers ?? [];
      const players = [...batters, ...pitchers, ...twoWayPlayers];

      setIsImportingEligibility(true);
      setImportProgress(0);
      setImportPlayer("");
      setImportError(null);
      setRetryStatus(null);

      try {
        const retryOptions = {
          onRetry: ({
            attempt,
            delayMs,
            status,
          }: {
            attempt: number;
            delayMs: number;
            status?: number;
          }) => {
            const statusLabel = status ? `status ${status}` : "network error";
            setRetryStatus(
              `Retry ${attempt} in ${(delayMs / 1000).toFixed(1)}s (${statusLabel})`
            );
          },
        };

        if (players.length === 0) {
          setImportProgress(100);
          applyEligibilityForGroup(group.id, new Map(), season);
          return true;
        }

        const mlbIds = players
          .map((player) => player.MLBAMID)
          .filter((id) => typeof id === "string" && id.trim().length > 0);

        const {
          fieldingById: fieldingMap,
          pitchingById: pitchingMap,
          primaryPositionById,
        } = await fetchSeasonStatsForPlayers(mlbIds, season, retryOptions);

        const eligibilityById = new Map<string, Eligibility>();

        for (let i = 0; i < players.length; i += 1) {
          const player = players[i];
          setImportPlayer(player.Name);
          const warnings: string[] = [];

          if (!player.MLBAMID) {
            warnings.push("Missing MLBAMID");
          }

          if (player._type === "batter") {
            const fielding = player.MLBAMID
              ? fieldingMap.get(player.MLBAMID)
              : undefined;
            const profilePosition = player.MLBAMID
              ? primaryPositionById.get(player.MLBAMID)
              : undefined;
            const hasFielding =
              fielding && Object.values(fielding).some((value) => value > 0);

            if (!hasFielding && profilePosition) {
              warnings.push(`Profile fallback: ${profilePosition}`);
              const eligibility = eligibilityFromProfilePosition(
                profilePosition,
                season,
                warnings
              );
              eligibilityById.set(player._id, eligibility);
            } else {
              if (!hasFielding) warnings.push("No fielding stats found");
              const positionGames = fielding ?? emptyPositionGames();
              const eligibility = computeHitterEligibility(
                positionGames,
                season,
                warnings
              );
              eligibilityById.set(player._id, eligibility);
            }
          } else if (player._type === "pitcher") {
            const pitching = player.MLBAMID
              ? pitchingMap.get(player.MLBAMID)
              : undefined;
            const profilePosition = player.MLBAMID
              ? primaryPositionById.get(player.MLBAMID)
              : undefined;

            if (!pitching && profilePosition) {
              warnings.push(`Profile fallback: ${profilePosition}`);
              const eligibility = eligibilityFromProfilePosition(
                profilePosition,
                season,
                warnings
              );
              eligibilityById.set(player._id, eligibility);
            } else {
              if (!pitching) warnings.push("No pitching stats found");
              const eligibility = computePitcherEligibility(
                pitching ?? { G: 0, GS: 0 },
                season,
                warnings
              );
              eligibilityById.set(player._id, eligibility);
            }
          } else {
            const battingWarnings: string[] = [];
            const pitchingWarnings: string[] = [];

            if (!player.MLBAMID) {
              battingWarnings.push("Missing MLBAMID");
              pitchingWarnings.push("Missing MLBAMID");
            }

            const fielding = player.MLBAMID
              ? fieldingMap.get(player.MLBAMID)
              : undefined;
            const profilePosition = player.MLBAMID
              ? primaryPositionById.get(player.MLBAMID)
              : undefined;
            const hasFielding =
              fielding && Object.values(fielding).some((value) => value > 0);

            let battingEligibility: Eligibility;
            if (!hasFielding && profilePosition) {
              battingWarnings.push(`Profile fallback: ${profilePosition}`);
              battingEligibility = eligibilityFromProfilePosition(
                profilePosition,
                season,
                battingWarnings
              );
            } else {
              if (!hasFielding) battingWarnings.push("No fielding stats found");
              battingEligibility = computeHitterEligibility(
                fielding ?? emptyPositionGames(),
                season,
                battingWarnings
              );
            }

            const pitching = player.MLBAMID
              ? pitchingMap.get(player.MLBAMID)
              : undefined;
            let pitchingEligibility: Eligibility;
            if (!pitching && profilePosition) {
              pitchingWarnings.push(`Profile fallback: ${profilePosition}`);
              pitchingEligibility = eligibilityFromProfilePosition(
                profilePosition,
                season,
                pitchingWarnings
              );
            } else {
              if (!pitching) pitchingWarnings.push("No pitching stats found");
              pitchingEligibility = computePitcherEligibility(
                pitching ?? { G: 0, GS: 0 },
                season,
                pitchingWarnings
              );
            }

            const merged = mergeTwoWayEligibility(
              battingEligibility,
              pitchingEligibility
            );
            merged.warnings = mergeWarnings(
              battingEligibility.warnings,
              pitchingEligibility.warnings
            );
            eligibilityById.set(player._id, merged);
          }

          const pct = Math.round(((i + 1) / players.length) * 100);
          setImportProgress(pct);

          if (i % 25 === 0) {
            await new Promise<void>((resolve) =>
              requestAnimationFrame(() => resolve())
            );
          }
        }

        applyEligibilityForGroup(group.id, eligibilityById, season);
        return true;
      } catch (importErr) {
        setImportError(
          importErr instanceof Error
            ? importErr.message
            : "Failed to import eligibility"
        );
        return false;
      } finally {
        setIsImportingEligibility(false);
        setRetryStatus(null);
        setImportPlayer("");
      }
    },
    [applyEligibilityForGroup]
  );

  const resetState = () => {
    setBatterFile(null);
    setPitcherFile(null);
    setGroupName("");
    setGroupNameTouched(false);
    setError(null);
    setImportEligibilityEnabled(false);
    setIsImportingEligibility(false);
    setImportProgress(0);
    setImportPlayer("");
    setImportError(null);
    setRetryStatus(null);
    setImportTargetGroup(null);
  };

  const handleCancel = () => {
    if (isImportingEligibility) return;
    resetState();
    onClose();
  };

  const handleConfirm = async () => {
    setError(null);

    const trimmedName = groupName.trim();
    if (!trimmedName) {
      setError("Group name is required.");
      return;
    }

    if (!batterFile && !pitcherFile) {
      setError("Please upload at least one CSV file.");
      return;
    }

    const batters = (batterFile?.parseResult.players ?? []) as Player[];
    const pitchers = (pitcherFile?.parseResult.players ?? []) as Player[];

    let twoWayPlayers: TwoWayPlayer[] = [];
    if (batters.length > 0 && pitchers.length > 0) {
      const { merged } = mergePlayers(batters, pitchers, "batter");
      twoWayPlayers = merged as TwoWayPlayer[];
    }

    const group: ProjectionGroup = {
      id: crypto.randomUUID(),
      name: trimmedName,
      createdAt: new Date().toISOString(),
      batters,
      pitchers,
      twoWayPlayers,
      batterIdSource: batterFile?.parseResult.idSource ?? null,
      pitcherIdSource: pitcherFile?.parseResult.idSource ?? null,
    };

    addProjectionGroup(group);

    if (importEligibilityEnabled) {
      setImportTargetGroup(group);
      const success = await runEligibilityImport(group);
      if (!success) return;
    }

    resetState();
    onClose();
  };

  const handleRetryImport = async () => {
    if (!importTargetGroup) return;
    const success = await runEligibilityImport(importTargetGroup);
    if (!success) return;
    resetState();
    onClose();
  };

  if (!isOpen) return null;

  const missingTypeWarning =
    (batterFile && !pitcherFile) || (!batterFile && pitcherFile)
      ? "This group is missing one file type and will be partial."
      : null;

  const renderPreview = (fileState: UploadFileState) => {
    const { parseResult } = fileState;

    return (
      <div className="mb-4 rounded-xl border-2 border-purple-200 dark:border-purple-800/60 bg-white dark:bg-[#0f0a1a] p-4 shadow-md">
        <p className="text-sm font-semibold text-[#1e1e2e] dark:text-[#f0f0f0]">
          Detected: <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-500">{parseResult.rowCount} {parseResult.type}s</span>
        </p>

        {parseResult.errors.length > 0 && (
          <div className="mt-2">
            <p className="text-sm font-bold text-amber-600 dark:text-amber-300">
              {parseResult.errors.length} warning(s):
            </p>
            <ul className="mt-1 max-h-20 overflow-y-auto text-xs text-amber-600 dark:text-amber-300">
              {parseResult.errors.slice(0, 5).map((err, i) => (
                <li key={i}>{err}</li>
              ))}
              {parseResult.errors.length > 5 && (
                <li>...and {parseResult.errors.length - 5} more</li>
              )}
            </ul>
          </div>
        )}

        <div className="mt-3">
          <p className="mb-2 text-sm font-bold uppercase tracking-wider text-[#1e1e2e] dark:text-[#f0f0f0]">
            Preview (first 5):
          </p>
          <div className="max-h-40 overflow-y-auto rounded-lg border-2 border-purple-200 dark:border-purple-800/60 bg-white dark:bg-[#1a1030]">
            <table className="w-full text-xs text-[#1e1e2e] dark:text-[#f0f0f0]">
              <thead className="bg-purple-600 dark:bg-purple-900 text-white">
                <tr>
                  <th className="px-2 py-1.5 text-left text-[10px] font-black uppercase tracking-wider">Name</th>
                  <th className="px-2 py-1.5 text-left text-[10px] font-black uppercase tracking-wider">Team</th>
                  {parseResult.type === "batter" ? (
                    <>
                      <th className="px-2 py-1.5 text-right text-[10px] font-black uppercase tracking-wider">HR</th>
                      <th className="px-2 py-1.5 text-right text-[10px] font-black uppercase tracking-wider">R</th>
                      <th className="px-2 py-1.5 text-right text-[10px] font-black uppercase tracking-wider">RBI</th>
                    </>
                  ) : (
                    <>
                      <th className="px-2 py-1.5 text-right text-[10px] font-black uppercase tracking-wider">W</th>
                      <th className="px-2 py-1.5 text-right text-[10px] font-black uppercase tracking-wider">SO</th>
                      <th className="px-2 py-1.5 text-right text-[10px] font-black uppercase tracking-wider">ERA</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {parseResult.players.slice(0, 5).map((p) => (
                  <tr
                    key={p._id}
                    className="border-t border-purple-100 dark:border-purple-900/50 odd:bg-[#f0f4ff] dark:odd:bg-[#0f0a1a]/50"
                  >
                    <td className="px-2 py-1 font-semibold">{p.Name}</td>
                    <td className="px-2 py-1">{p.Team}</td>
                    {p._type === "batter" ? (
                      <>
                        <td className="px-2 py-1 text-right font-bold">
                          {(p as unknown as Record<string, number>).HR}
                        </td>
                        <td className="px-2 py-1 text-right font-bold">
                          {(p as unknown as Record<string, number>).R}
                        </td>
                        <td className="px-2 py-1 text-right font-bold">
                          {(p as unknown as Record<string, number>).RBI}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-2 py-1 text-right font-bold">
                          {(p as unknown as Record<string, number>).W}
                        </td>
                        <td className="px-2 py-1 text-right font-bold">
                          {(p as unknown as Record<string, number>).SO}
                        </td>
                        <td className="px-2 py-1 text-right font-bold">
                          {(p as unknown as Record<string, number>).ERA?.toFixed(2)}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/70 backdrop-blur-sm">
      <div className="relative mx-0 h-full w-full max-w-none rounded-none border-2 border-purple-300 dark:border-purple-800 bg-white dark:bg-[#1a1030] p-4 shadow-2xl shadow-purple-500/20 overflow-y-auto sm:mx-4 sm:h-auto sm:max-h-[85vh] sm:max-w-lg sm:rounded-2xl sm:p-6">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-600 to-blue-500 sm:rounded-t-2xl" />
        <button
          type="button"
          onClick={handleCancel}
          disabled={isImportingEligibility}
          aria-label="Close upload modal"
          className="absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-purple-200 dark:border-purple-800 bg-white dark:bg-[#0f0a1a] text-slate-500 dark:text-slate-300 shadow-sm transition hover:bg-purple-50 dark:hover:bg-purple-950/50 hover:text-purple-700 dark:hover:text-purple-300 disabled:cursor-not-allowed disabled:opacity-60 sm:right-6 sm:top-6"
        >
          <span className="text-lg leading-none font-bold">x</span>
        </button>
        <h2 className="mb-4 pr-10 text-lg font-black uppercase tracking-wider text-[#1e1e2e] dark:text-[#f0f0f0]">
          Upload Player Projections
        </h2>

        {error && (
          <div className="mb-4 rounded-xl border-2 border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-3 text-sm font-semibold text-red-600 dark:text-red-300">
            {error}
          </div>
        )}

        {!batterFile && !pitcherFile ? (
          <>
            <div className="mb-4">
              <label className="mb-2 block text-sm font-bold uppercase tracking-wider text-[#1e1e2e] dark:text-[#f0f0f0]">
                Player Type
              </label>
              <select
                value={uploadType}
                onChange={(e) => setUploadType(e.target.value as UploadType)}
                className="w-full rounded-lg border-2 border-purple-200 dark:border-purple-700 bg-white dark:bg-[#0f0a1a] px-3 py-2 text-sm font-semibold text-[#1e1e2e] dark:text-[#f0f0f0] focus:border-purple-500 dark:focus:border-purple-400 focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-800"
              >
                <option value="auto">Auto-detect</option>
                <option value="batter">Batters</option>
                <option value="pitcher">Pitchers</option>
              </select>
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              className={`mb-4 flex h-40 flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-all ${
                dragActive
                  ? "border-purple-500 bg-purple-50 dark:bg-purple-950/30 shadow-lg shadow-purple-500/20"
                  : "border-purple-300 dark:border-purple-700 bg-[#f0f4ff] dark:bg-[#0f0a1a]"
              }`}
            >
              <p className="mb-2 text-sm font-bold text-[#1e1e2e] dark:text-[#f0f0f0]">
                Drag and drop CSV/TSV files here
              </p>
              <p className="mb-3 text-xs font-medium text-slate-500 dark:text-slate-400">or</p>
              <label className="cursor-pointer rounded-lg bg-gradient-to-r from-purple-600 to-blue-500 px-5 py-2 text-sm font-bold uppercase tracking-wider text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:brightness-110 transition-all">
                Browse Files
                <input
                  type="file"
                  accept=".csv,.tsv,.txt"
                  multiple
                  onChange={handleChange}
                  className="hidden"
                />
              </label>
            </div>


            <div className="flex justify-end">
              <button
                onClick={handleCancel}
                className="rounded-lg border-2 border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </>
        ) : needsIdSelection ? (
          <>
            <div className="mb-4 rounded-xl border-2 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 p-4">
              <p className="text-sm font-bold text-amber-700 dark:text-amber-300">
                No MLBAMID or PlayerId column found
              </p>
              <p className="mt-1 text-sm font-medium text-amber-600 dark:text-amber-400">
                Select a column to use as the unique player identifier, or generate IDs automatically.
              </p>
            </div>

            {batterFile?.parseResult.needsIdSelection && (
              <div className="mb-4">
                <p className="mb-2 text-sm font-bold text-[#1e1e2e] dark:text-[#f0f0f0]">
                  Batter file: {batterFile.file.name}
                </p>
                <label className="mb-2 block text-sm font-bold uppercase tracking-wider text-[#1e1e2e] dark:text-[#f0f0f0]">
                  ID Source
                </label>
                <select
                  value={batterFile.selectedIdSource}
                  onChange={(e) =>
                    setBatterFile({
                      ...batterFile,
                      selectedIdSource: e.target.value as IdSource | "custom",
                    })
                  }
                  className="w-full rounded-lg border-2 border-purple-200 dark:border-purple-700 bg-white dark:bg-[#0f0a1a] px-3 py-2 text-sm font-semibold text-[#1e1e2e] dark:text-[#f0f0f0] focus:border-purple-500 dark:focus:border-purple-400 focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-800"
                >
                  <option value="generated">Generate IDs automatically</option>
                  <option value="custom">Use a column from the file</option>
                </select>

                {batterFile.selectedIdSource === "custom" && (
                  <div className="mt-3">
                    <label className="mb-2 block text-sm font-bold uppercase tracking-wider text-[#1e1e2e] dark:text-[#f0f0f0]">
                      Select Column
                    </label>
                    <select
                      value={batterFile.customIdColumn}
                      onChange={(e) =>
                        setBatterFile({ ...batterFile, customIdColumn: e.target.value })
                      }
                      className="w-full rounded-lg border-2 border-purple-200 dark:border-purple-700 bg-white dark:bg-[#0f0a1a] px-3 py-2 text-sm font-semibold text-[#1e1e2e] dark:text-[#f0f0f0] focus:border-purple-500 dark:focus:border-purple-400 focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-800"
                    >
                      {batterFile.parseResult.availableColumns.map((col) => (
                        <option key={col} value={col}>
                          {col}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {pitcherFile?.parseResult.needsIdSelection && (
              <div className="mb-4">
                <p className="mb-2 text-sm font-bold text-[#1e1e2e] dark:text-[#f0f0f0]">
                  Pitcher file: {pitcherFile.file.name}
                </p>
                <label className="mb-2 block text-sm font-bold uppercase tracking-wider text-[#1e1e2e] dark:text-[#f0f0f0]">
                  ID Source
                </label>
                <select
                  value={pitcherFile.selectedIdSource}
                  onChange={(e) =>
                    setPitcherFile({
                      ...pitcherFile,
                      selectedIdSource: e.target.value as IdSource | "custom",
                    })
                  }
                  className="w-full rounded-lg border-2 border-purple-200 dark:border-purple-700 bg-white dark:bg-[#0f0a1a] px-3 py-2 text-sm font-semibold text-[#1e1e2e] dark:text-[#f0f0f0] focus:border-purple-500 dark:focus:border-purple-400 focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-800"
                >
                  <option value="generated">Generate IDs automatically</option>
                  <option value="custom">Use a column from the file</option>
                </select>

                {pitcherFile.selectedIdSource === "custom" && (
                  <div className="mt-3">
                    <label className="mb-2 block text-sm font-bold uppercase tracking-wider text-[#1e1e2e] dark:text-[#f0f0f0]">
                      Select Column
                    </label>
                    <select
                      value={pitcherFile.customIdColumn}
                      onChange={(e) =>
                        setPitcherFile({ ...pitcherFile, customIdColumn: e.target.value })
                      }
                      className="w-full rounded-lg border-2 border-purple-200 dark:border-purple-700 bg-white dark:bg-[#0f0a1a] px-3 py-2 text-sm font-semibold text-[#1e1e2e] dark:text-[#f0f0f0] focus:border-purple-500 dark:focus:border-purple-400 focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-800"
                    >
                      {pitcherFile.parseResult.availableColumns.map((col) => (
                        <option key={col} value={col}>
                          {col}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={handleCancel}
                className="rounded-lg border-2 border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleIdSelection}
                className="rounded-lg bg-gradient-to-r from-purple-600 to-blue-500 px-4 py-2 text-sm font-bold uppercase tracking-wider text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:brightness-110 transition-all"
              >
                Continue
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mb-4">
              <label className="mb-2 block text-sm font-bold uppercase tracking-wider text-[#1e1e2e] dark:text-[#f0f0f0]">
                Group Name
              </label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => {
                  setGroupName(e.target.value);
                  setGroupNameTouched(true);
                }}
                className="w-full rounded-lg border-2 border-purple-200 dark:border-purple-700 bg-white dark:bg-[#0f0a1a] px-3 py-2 text-sm font-semibold text-[#1e1e2e] dark:text-[#f0f0f0] placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-purple-500 dark:focus:border-purple-400 focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-800"
                placeholder="e.g. Steamer 2025"
              />
            </div>

            <div className="mb-4 rounded-xl border-2 border-purple-200 dark:border-purple-800/60 bg-[#f0f4ff] dark:bg-[#0f0a1a] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black uppercase tracking-wider text-[#1e1e2e] dark:text-[#f0f0f0]">
                    Import Position Eligibility
                  </p>
                  <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                    Uses MLB games to assign positions after upload. Requires MLBAMID.
                  </p>
                </div>
                <label className="relative inline-flex h-7 w-12 shrink-0 items-center">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={importEligibilityEnabled}
                    onChange={(e) => setImportEligibilityEnabled(e.target.checked)}
                    disabled={isImportingEligibility}
                    aria-label="Import Position Eligibility"
                  />
                  <span className="h-7 w-12 rounded-full bg-slate-300 dark:bg-slate-700 transition peer-checked:bg-gradient-to-r peer-checked:from-purple-600 peer-checked:to-blue-500 peer-checked:shadow-lg peer-checked:shadow-purple-500/30 peer-disabled:opacity-60" />
                  <span className="absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-sm transition peer-checked:translate-x-5 peer-disabled:opacity-80" />
                </label>
              </div>
              <p className="mt-2 text-xs font-medium text-slate-400 dark:text-slate-500">
                May take a minute for larger files.
              </p>
            </div>

            {missingTypeWarning && (
              <div className="mb-4 rounded-xl border-2 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 p-3 text-sm font-semibold text-amber-600 dark:text-amber-300">
                {missingTypeWarning}
              </div>
            )}

            {batterFile && renderPreview(batterFile)}
            {pitcherFile && renderPreview(pitcherFile)}

            {(isImportingEligibility || importError) && (
              <div className="mb-4 rounded-xl border-2 border-purple-200 dark:border-purple-800/60 bg-white dark:bg-[#0f0a1a] p-3 text-sm shadow-md">
                {isImportingEligibility && (
                  <>
                    {(() => {
                      const progressWidth = Math.min(
                        100,
                        Math.max(0, Number(importProgress) || 0)
                      );
                      return (
                        <>
                          <div className="mb-2 flex items-center justify-between">
                            <span className="font-bold uppercase tracking-wider text-[#1e1e2e] dark:text-[#f0f0f0]">
                              Importing eligibility: {Math.round(progressWidth)}%
                            </span>
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                              {importPlayer}
                            </span>
                          </div>
                          <div
                            className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
                            style={{
                              backgroundImage:
                                "linear-gradient(to right, #7c3aed, #3b82f6)",
                              backgroundSize: `${progressWidth}% 100%`,
                              backgroundRepeat: "no-repeat",
                            }}
                            role="progressbar"
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={Math.round(progressWidth)}
                          />
                        </>
                      );
                    })()}
                    {retryStatus && (
                      <p className="mt-2 text-xs font-semibold text-amber-600 dark:text-amber-300">
                        {retryStatus}
                      </p>
                    )}
                  </>
                )}
                {importError && !isImportingEligibility && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-red-600 dark:text-red-300">
                      {importError}
                    </span>
                    <button
                      onClick={() => void handleRetryImport()}
                      className="rounded-lg bg-red-500 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-md hover:bg-red-600 transition-colors"
                    >
                      Retry Import
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setBatterFile(null);
                  setPitcherFile(null);
                  setError(null);
                }}
                disabled={isImportingEligibility}
                className="rounded-lg border-2 border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleConfirm}
                disabled={isImportingEligibility}
                className="rounded-lg bg-gradient-to-r from-purple-600 to-blue-500 px-4 py-2 text-sm font-bold uppercase tracking-wider text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 transition-all"
              >
                {isImportingEligibility
                  ? "Importing Group..."
                  : importEligibilityEnabled
                    ? "Import Group & Positions"
                    : "Import Group"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
