"use client";

import { useState, useCallback, useEffect } from "react";
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

  const handleCancel = useCallback(() => {
    if (isImportingEligibility) return;
    resetState();
    onClose();
  }, [isImportingEligibility, onClose]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isImportingEligibility) {
        handleCancel();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isImportingEligibility, handleCancel]);

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
      <div className="mb-3 border border-gray-700 dark:border-gray-800 bg-[#0a0a0a] dark:bg-[#050505] p-3">
        <p className="text-[11px] text-gray-300 dark:text-gray-400 font-mono">
          Detected: <span className="font-bold text-[#00ff88]">{parseResult.rowCount} {parseResult.type}s</span>
        </p>

        {parseResult.errors.length > 0 && (
          <div className="mt-2">
            <p className="text-[11px] font-bold text-amber-500 font-mono">
              {parseResult.errors.length} warning(s):
            </p>
            <ul className="mt-1 max-h-20 overflow-y-auto text-[10px] text-amber-500/80 font-mono">
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
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-500 font-mono">
            Preview (first 5):
          </p>
          <div className="max-h-40 overflow-y-auto border border-gray-800 bg-black">
            <table className="w-full text-[10px] text-gray-300 font-mono">
              <thead className="bg-[#111] text-gray-500">
                <tr>
                  <th className="px-2 py-1 text-left font-bold uppercase">Name</th>
                  <th className="px-2 py-1 text-left font-bold uppercase">Team</th>
                  {parseResult.type === "batter" ? (
                    <>
                      <th className="px-2 py-1 text-right font-bold uppercase">HR</th>
                      <th className="px-2 py-1 text-right font-bold uppercase">R</th>
                      <th className="px-2 py-1 text-right font-bold uppercase">RBI</th>
                    </>
                  ) : (
                    <>
                      <th className="px-2 py-1 text-right font-bold uppercase">W</th>
                      <th className="px-2 py-1 text-right font-bold uppercase">SO</th>
                      <th className="px-2 py-1 text-right font-bold uppercase">ERA</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="text-gray-300">
                {parseResult.players.slice(0, 5).map((p) => (
                  <tr
                    key={p._id}
                    className="border-t border-gray-800 odd:bg-[#0a0a0a]"
                  >
                    <td className="px-2 py-1">{p.Name}</td>
                    <td className="px-2 py-1">{p.Team}</td>
                    {p._type === "batter" ? (
                      <>
                        <td className="px-2 py-1 text-right">
                          {(p as unknown as Record<string, number>).HR}
                        </td>
                        <td className="px-2 py-1 text-right">
                          {(p as unknown as Record<string, number>).R}
                        </td>
                        <td className="px-2 py-1 text-right">
                          {(p as unknown as Record<string, number>).RBI}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-2 py-1 text-right">
                          {(p as unknown as Record<string, number>).W}
                        </td>
                        <td className="px-2 py-1 text-right">
                          {(p as unknown as Record<string, number>).SO}
                        </td>
                        <td className="px-2 py-1 text-right">
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 dark:bg-black/80">
      <div role="dialog" aria-modal="true" aria-labelledby="v1-upload-title" className="relative mx-0 h-full w-full max-w-none border border-gray-700 dark:border-gray-800 border-t-2 border-t-[#00ff88] bg-[#0a0a0a] dark:bg-[#0a0a0a] p-4 overflow-y-auto sm:mx-4 sm:h-auto sm:max-h-[85vh] sm:max-w-lg sm:p-5">
        <button
          type="button"
          onClick={handleCancel}
          disabled={isImportingEligibility}
          aria-label="Close upload modal"
          className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center border border-gray-700 dark:border-gray-800 bg-black text-gray-500 hover:text-white hover:border-gray-500 transition-colors disabled:cursor-not-allowed disabled:opacity-60 sm:right-5 sm:top-5"
        >
          <span className="text-sm leading-none font-mono">x</span>
        </button>
        <h2 id="v1-upload-title" className="mb-4 pr-10 text-xs font-bold uppercase tracking-wider text-white font-mono">
          Upload Player Projections
        </h2>

        {error && (
          <div className="mb-3 border border-red-900 bg-red-950/30 p-2 text-[11px] text-red-400 font-mono">
            {error}
          </div>
        )}

        {!batterFile && !pitcherFile ? (
          <>
            <div className="mb-4">
              <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-gray-500 font-mono">
                Player Type
              </label>
              <select
                value={uploadType}
                onChange={(e) => setUploadType(e.target.value as UploadType)}
                className="w-full border border-gray-700 dark:border-gray-800 bg-black px-3 py-2 text-[11px] text-[#00ff88] font-mono focus:border-[#00ff88] focus:outline-none"
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
              className={`mb-4 flex h-36 flex-col items-center justify-center border border-dashed transition-colors ${
                dragActive
                  ? "border-[#00ff88] bg-[#00ff88]/5"
                  : "border-gray-700 dark:border-gray-800 bg-black/50"
              }`}
            >
              <p className="mb-2 text-[11px] text-gray-400 font-mono">
                Drag and drop CSV/TSV files here
              </p>
              <p className="mb-3 text-[10px] text-gray-600 font-mono">or</p>
              <label className="cursor-pointer border border-[#00ff88] bg-[#00ff88]/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#00ff88] shadow-[0_0_10px_rgba(0,255,136,0.3)] hover:bg-[#00ff88]/20 transition-colors">
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
                className="border border-gray-700 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-400 hover:text-white hover:border-gray-500 transition-colors"
              >
                Cancel
              </button>
            </div>
          </>
        ) : needsIdSelection ? (
          <>
            <div className="mb-4 border border-amber-900/50 bg-amber-950/20 p-3">
              <p className="text-[11px] font-bold text-amber-400 font-mono">
                No MLBAMID or PlayerId column found
              </p>
              <p className="mt-1 text-[10px] text-amber-500/80 font-mono">
                Select a column to use as the unique player identifier, or generate IDs automatically.
              </p>
            </div>

            {batterFile?.parseResult.needsIdSelection && (
              <div className="mb-4">
                <p className="mb-2 text-[11px] font-bold text-gray-300 font-mono">
                  Batter file: {batterFile.file.name}
                </p>
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-gray-500 font-mono">
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
                  className="w-full border border-gray-700 dark:border-gray-800 bg-black px-3 py-2 text-[11px] text-[#00ff88] font-mono focus:border-[#00ff88] focus:outline-none"
                >
                  <option value="generated">Generate IDs automatically</option>
                  <option value="custom">Use a column from the file</option>
                </select>

                {batterFile.selectedIdSource === "custom" && (
                  <div className="mt-3">
                    <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-gray-500 font-mono">
                      Select Column
                    </label>
                    <select
                      value={batterFile.customIdColumn}
                      onChange={(e) =>
                        setBatterFile({ ...batterFile, customIdColumn: e.target.value })
                      }
                      className="w-full border border-gray-700 dark:border-gray-800 bg-black px-3 py-2 text-[11px] text-[#00ff88] font-mono focus:border-[#00ff88] focus:outline-none"
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
                <p className="mb-2 text-[11px] font-bold text-gray-300 font-mono">
                  Pitcher file: {pitcherFile.file.name}
                </p>
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-gray-500 font-mono">
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
                  className="w-full border border-gray-700 dark:border-gray-800 bg-black px-3 py-2 text-[11px] text-[#00ff88] font-mono focus:border-[#00ff88] focus:outline-none"
                >
                  <option value="generated">Generate IDs automatically</option>
                  <option value="custom">Use a column from the file</option>
                </select>

                {pitcherFile.selectedIdSource === "custom" && (
                  <div className="mt-3">
                    <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-gray-500 font-mono">
                      Select Column
                    </label>
                    <select
                      value={pitcherFile.customIdColumn}
                      onChange={(e) =>
                        setPitcherFile({ ...pitcherFile, customIdColumn: e.target.value })
                      }
                      className="w-full border border-gray-700 dark:border-gray-800 bg-black px-3 py-2 text-[11px] text-[#00ff88] font-mono focus:border-[#00ff88] focus:outline-none"
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
                className="border border-gray-700 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-400 hover:text-white hover:border-gray-500 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleIdSelection}
                className="border border-[#00ff88] bg-[#00ff88]/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#00ff88] shadow-[0_0_10px_rgba(0,255,136,0.3)] hover:bg-[#00ff88]/20 transition-colors"
              >
                Continue
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mb-4">
              <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-gray-500 font-mono">
                Group Name
              </label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => {
                  setGroupName(e.target.value);
                  setGroupNameTouched(true);
                }}
                className="w-full border border-gray-700 dark:border-gray-800 bg-black px-3 py-2 text-[11px] text-white font-mono placeholder:text-gray-600 focus:border-[#00ff88] focus:outline-none"
                placeholder="e.g. Steamer 2025"
              />
            </div>

            <div className="mb-4 border border-gray-700 dark:border-gray-800 bg-[#0a0a0a] p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-gray-300 font-mono">
                    Import Position Eligibility
                  </p>
                  <p className="mt-1 text-[10px] text-gray-500 font-mono">
                    Uses MLB games to assign positions after upload. Requires MLBAMID.
                  </p>
                </div>
                <button
                  role="switch"
                  aria-checked={importEligibilityEnabled}
                  onClick={() => {
                    if (!isImportingEligibility) {
                      setImportEligibilityEnabled(!importEligibilityEnabled);
                    }
                  }}
                  disabled={isImportingEligibility}
                  className={`relative inline-flex h-5 w-10 shrink-0 items-center transition-colors ${
                    importEligibilityEnabled
                      ? "bg-[#00ff88]/20 border border-[#00ff88]/50"
                      : "bg-gray-700 border border-gray-600"
                  } ${isImportingEligibility ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                  <span
                    className={`inline-block h-3 w-3 transform transition-transform ${
                      importEligibilityEnabled
                        ? "translate-x-6 bg-[#00ff88] shadow-[0_0_6px_rgba(0,255,136,0.5)]"
                        : "translate-x-1 bg-gray-400"
                    }`}
                  />
                </button>
              </div>
              <p className="mt-2 text-[10px] text-gray-600 font-mono">
                May take a minute for larger files.
              </p>
            </div>

            {missingTypeWarning && (
              <div className="mb-3 border border-amber-900/50 bg-amber-950/20 p-2 text-[11px] text-amber-400 font-mono">
                {missingTypeWarning}
              </div>
            )}

            {batterFile && renderPreview(batterFile)}
            {pitcherFile && renderPreview(pitcherFile)}

            {(isImportingEligibility || importError) && (
              <div className="mb-3 border border-gray-700 dark:border-gray-800 bg-[#0a0a0a] p-3 text-[11px] font-mono">
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
                            <span className="font-bold text-[#00ff88]">
                              Importing eligibility: {Math.round(progressWidth)}%
                            </span>
                            <span className="text-[10px] text-gray-500">
                              {importPlayer}
                            </span>
                          </div>
                          <div
                            className="h-1 w-full overflow-hidden bg-gray-800"
                            style={{
                              backgroundImage:
                                "linear-gradient(to right, #00ff88, #00ff88)",
                              backgroundSize: `${progressWidth}% 100%`,
                              backgroundRepeat: "no-repeat",
                            }}
                            role="progressbar"
                            aria-label="Eligibility import progress"
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={Math.round(progressWidth)}
                          />
                        </>
                      );
                    })()}
                    {retryStatus && (
                      <p className="mt-2 text-[10px] text-amber-500">
                        {retryStatus}
                      </p>
                    )}
                  </>
                )}
                {importError && !isImportingEligibility && (
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-red-400">
                      {importError}
                    </span>
                    <button
                      onClick={() => void handleRetryImport()}
                      className="border border-red-800 bg-red-950/40 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-red-400 hover:bg-red-950/60 transition-colors"
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
                className="border border-gray-700 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-400 hover:text-white hover:border-gray-500 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
              >
                Back
              </button>
              <button
                onClick={handleConfirm}
                disabled={isImportingEligibility}
                className="border border-[#00ff88] bg-[#00ff88]/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#00ff88] shadow-[0_0_10px_rgba(0,255,136,0.3)] hover:bg-[#00ff88]/20 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
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
