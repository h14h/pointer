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
      <div className="mb-5 border-t border-[#111111]/10 dark:border-[#333333] pt-4">
        <p className="text-sm text-[#111111] dark:text-[#e5e5e5]">
          Detected: <span className="font-bold">{parseResult.rowCount} {parseResult.type}s</span>
        </p>

        {parseResult.errors.length > 0 && (
          <div className="mt-2">
            <p className="text-sm font-bold text-[#111111]/70 dark:text-[#e5e5e5]/60">
              {parseResult.errors.length} warning(s):
            </p>
            <ul className="mt-1 max-h-20 overflow-y-auto text-xs text-[#111111]/60 dark:text-[#e5e5e5]/50">
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
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#111111]/50 dark:text-[#e5e5e5]/40" style={{ fontVariant: "small-caps" }}>
            Preview (first 5)
          </p>
          <div className="max-h-40 overflow-y-auto">
            <table className="w-full text-xs text-[#111111] dark:text-[#e5e5e5]">
              <thead>
                <tr className="border-b-2 border-[#111111] dark:border-[#e5e5e5]">
                  <th className="px-2 py-1 text-left text-[10px] font-bold uppercase tracking-widest">Name</th>
                  <th className="px-2 py-1 text-left text-[10px] font-bold uppercase tracking-widest">Team</th>
                  {parseResult.type === "batter" ? (
                    <>
                      <th className="px-2 py-1 text-right text-[10px] font-bold uppercase tracking-widest">HR</th>
                      <th className="px-2 py-1 text-right text-[10px] font-bold uppercase tracking-widest">R</th>
                      <th className="px-2 py-1 text-right text-[10px] font-bold uppercase tracking-widest">RBI</th>
                    </>
                  ) : (
                    <>
                      <th className="px-2 py-1 text-right text-[10px] font-bold uppercase tracking-widest">W</th>
                      <th className="px-2 py-1 text-right text-[10px] font-bold uppercase tracking-widest">SO</th>
                      <th className="px-2 py-1 text-right text-[10px] font-bold uppercase tracking-widest">ERA</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {parseResult.players.slice(0, 5).map((p) => (
                  <tr
                    key={p._id}
                    className="border-b border-[#111111]/10 dark:border-[#333333]/60"
                  >
                    <td className="px-2 py-1.5">{p.Name}</td>
                    <td className="px-2 py-1.5">{p.Team}</td>
                    {p._type === "batter" ? (
                      <>
                        <td className="px-2 py-1.5 text-right">
                          {(p as unknown as Record<string, number>).HR}
                        </td>
                        <td className="px-2 py-1.5 text-right">
                          {(p as unknown as Record<string, number>).R}
                        </td>
                        <td className="px-2 py-1.5 text-right">
                          {(p as unknown as Record<string, number>).RBI}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-2 py-1.5 text-right">
                          {(p as unknown as Record<string, number>).W}
                        </td>
                        <td className="px-2 py-1.5 text-right">
                          {(p as unknown as Record<string, number>).SO}
                        </td>
                        <td className="px-2 py-1.5 text-right">
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111111]/20 dark:bg-black/60">
      <div className="relative mx-0 h-full w-full max-w-none rounded-none border-l-4 border-l-[#dc2626] dark:border-l-[#ef4444] border-y border-r border-y-[#111111]/10 dark:border-y-[#333333] border-r-[#111111]/10 dark:border-r-[#333333] bg-white dark:bg-[#111111] p-6 overflow-y-auto font-sans sm:mx-4 sm:h-auto sm:max-h-[85vh] sm:max-w-lg sm:rounded-sm sm:p-8">
        <button
          type="button"
          onClick={handleCancel}
          disabled={isImportingEligibility}
          aria-label="Close upload modal"
          className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center text-[#111111]/50 dark:text-[#e5e5e5]/40 hover:text-[#111111] dark:hover:text-[#e5e5e5] transition-colors disabled:cursor-not-allowed disabled:opacity-60 sm:right-6 sm:top-6"
        >
          <span className="text-xl leading-none">&times;</span>
        </button>
        <h2 className="mb-5 pr-10 text-xl font-bold text-[#111111] dark:text-[#e5e5e5]" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
          Upload Player Projections
        </h2>

        {error && (
          <div className="mb-4 border-l-4 border-l-[#dc2626] dark:border-l-[#ef4444] bg-[#dc2626]/5 dark:bg-[#ef4444]/5 p-3 text-sm text-[#dc2626] dark:text-[#ef4444]">
            {error}
          </div>
        )}

        {!batterFile && !pitcherFile ? (
          <>
            <div className="mb-5">
              <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-[#111111]/50 dark:text-[#e5e5e5]/40" style={{ fontVariant: "small-caps" }}>
                Player Type
              </label>
              <select
                value={uploadType}
                onChange={(e) => setUploadType(e.target.value as UploadType)}
                className="w-full rounded-sm border border-[#111111]/20 dark:border-[#333333] bg-white dark:bg-[#1a1a1a] px-3 py-2 text-sm text-[#111111] dark:text-[#e5e5e5] focus:border-[#dc2626] dark:focus:border-[#ef4444] focus:outline-none"
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
              className={`mb-5 flex h-40 flex-col items-center justify-center border-2 border-dashed rounded-sm transition-colors ${
                dragActive
                  ? "border-[#dc2626] dark:border-[#ef4444] bg-[#dc2626]/5 dark:bg-[#ef4444]/5"
                  : "border-[#111111]/20 dark:border-[#333333] bg-white dark:bg-[#111111]"
              }`}
            >
              <p className="mb-2 text-sm text-[#111111]/70 dark:text-[#e5e5e5]/60">
                Drag and drop CSV/TSV files here
              </p>
              <p className="mb-3 text-xs text-[#111111]/30 dark:text-[#e5e5e5]/20">or</p>
              <label className="cursor-pointer rounded-sm bg-[#dc2626] dark:bg-[#ef4444] px-4 py-2 text-xs font-bold uppercase tracking-widest text-white hover:bg-[#b91c1c] dark:hover:bg-[#dc2626]">
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
                className="text-xs font-bold uppercase tracking-widest text-[#111111]/50 dark:text-[#e5e5e5]/40 hover:text-[#111111] dark:hover:text-[#e5e5e5]"
              >
                Cancel
              </button>
            </div>
          </>
        ) : needsIdSelection ? (
          <>
            <div className="mb-5 border-l-4 border-l-[#111111]/30 dark:border-l-[#e5e5e5]/20 bg-[#f5f5f5] dark:bg-[#1a1a1a] p-4">
              <p className="text-sm font-bold text-[#111111] dark:text-[#e5e5e5]">
                No MLBAMID or PlayerId column found
              </p>
              <p className="mt-1 text-sm text-[#111111]/60 dark:text-[#e5e5e5]/50">
                Select a column to use as the unique player identifier, or generate IDs automatically.
              </p>
            </div>

            {batterFile?.parseResult.needsIdSelection && (
              <div className="mb-5">
                <p className="mb-2 text-sm font-bold text-[#111111] dark:text-[#e5e5e5]">
                  Batter file: {batterFile.file.name}
                </p>
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-[#111111]/50 dark:text-[#e5e5e5]/40" style={{ fontVariant: "small-caps" }}>
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
                  className="w-full rounded-sm border border-[#111111]/20 dark:border-[#333333] bg-white dark:bg-[#1a1a1a] px-3 py-2 text-sm text-[#111111] dark:text-[#e5e5e5] focus:border-[#dc2626] dark:focus:border-[#ef4444] focus:outline-none"
                >
                  <option value="generated">Generate IDs automatically</option>
                  <option value="custom">Use a column from the file</option>
                </select>

                {batterFile.selectedIdSource === "custom" && (
                  <div className="mt-3">
                    <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-[#111111]/50 dark:text-[#e5e5e5]/40" style={{ fontVariant: "small-caps" }}>
                      Select Column
                    </label>
                    <select
                      value={batterFile.customIdColumn}
                      onChange={(e) =>
                        setBatterFile({ ...batterFile, customIdColumn: e.target.value })
                      }
                      className="w-full rounded-sm border border-[#111111]/20 dark:border-[#333333] bg-white dark:bg-[#1a1a1a] px-3 py-2 text-sm text-[#111111] dark:text-[#e5e5e5] focus:border-[#dc2626] dark:focus:border-[#ef4444] focus:outline-none"
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
              <div className="mb-5">
                <p className="mb-2 text-sm font-bold text-[#111111] dark:text-[#e5e5e5]">
                  Pitcher file: {pitcherFile.file.name}
                </p>
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-[#111111]/50 dark:text-[#e5e5e5]/40" style={{ fontVariant: "small-caps" }}>
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
                  className="w-full rounded-sm border border-[#111111]/20 dark:border-[#333333] bg-white dark:bg-[#1a1a1a] px-3 py-2 text-sm text-[#111111] dark:text-[#e5e5e5] focus:border-[#dc2626] dark:focus:border-[#ef4444] focus:outline-none"
                >
                  <option value="generated">Generate IDs automatically</option>
                  <option value="custom">Use a column from the file</option>
                </select>

                {pitcherFile.selectedIdSource === "custom" && (
                  <div className="mt-3">
                    <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-[#111111]/50 dark:text-[#e5e5e5]/40" style={{ fontVariant: "small-caps" }}>
                      Select Column
                    </label>
                    <select
                      value={pitcherFile.customIdColumn}
                      onChange={(e) =>
                        setPitcherFile({ ...pitcherFile, customIdColumn: e.target.value })
                      }
                      className="w-full rounded-sm border border-[#111111]/20 dark:border-[#333333] bg-white dark:bg-[#1a1a1a] px-3 py-2 text-sm text-[#111111] dark:text-[#e5e5e5] focus:border-[#dc2626] dark:focus:border-[#ef4444] focus:outline-none"
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

            <div className="flex justify-end gap-3">
              <button
                onClick={handleCancel}
                className="text-xs font-bold uppercase tracking-widest text-[#111111]/50 dark:text-[#e5e5e5]/40 hover:text-[#111111] dark:hover:text-[#e5e5e5]"
              >
                Cancel
              </button>
              <button
                onClick={handleIdSelection}
                className="rounded-sm bg-[#dc2626] dark:bg-[#ef4444] px-4 py-2 text-xs font-bold uppercase tracking-widest text-white hover:bg-[#b91c1c] dark:hover:bg-[#dc2626]"
              >
                Continue
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mb-5">
              <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-[#111111]/50 dark:text-[#e5e5e5]/40" style={{ fontVariant: "small-caps" }}>
                Group Name
              </label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => {
                  setGroupName(e.target.value);
                  setGroupNameTouched(true);
                }}
                className="w-full rounded-sm border border-[#111111]/20 dark:border-[#333333] bg-white dark:bg-[#1a1a1a] px-3 py-2 text-sm text-[#111111] dark:text-[#e5e5e5] placeholder:text-[#111111]/30 dark:placeholder:text-[#e5e5e5]/20 focus:border-[#dc2626] dark:focus:border-[#ef4444] focus:outline-none"
                placeholder="e.g. Steamer 2025"
              />
            </div>

            <div className="mb-5 border-t border-[#111111]/10 dark:border-[#333333] pt-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-[#111111] dark:text-[#e5e5e5]">
                    Import Position Eligibility
                  </p>
                  <p className="mt-1 text-xs text-[#111111]/50 dark:text-[#e5e5e5]/40">
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
                  aria-label="Import Position Eligibility"
                  className={`relative inline-flex h-5 w-10 shrink-0 items-center rounded-sm border transition-colors ${
                    importEligibilityEnabled
                      ? "border-[#dc2626] dark:border-[#ef4444] bg-[#dc2626] dark:bg-[#ef4444]"
                      : "border-[#111111]/30 dark:border-[#333333] bg-transparent"
                  } ${isImportingEligibility ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                  <span
                    className={`inline-block h-3 w-3 transform rounded-sm transition-transform ${
                      importEligibilityEnabled
                        ? "translate-x-6 bg-white"
                        : "translate-x-1 bg-[#111111]/40 dark:bg-[#e5e5e5]/40"
                    }`}
                  />
                </button>
              </div>
              <p className="mt-2 text-xs text-[#111111]/30 dark:text-[#e5e5e5]/20">
                May take a minute for larger files.
              </p>
            </div>

            {missingTypeWarning && (
              <div className="mb-4 border-l-4 border-l-[#111111]/30 dark:border-l-[#e5e5e5]/20 bg-[#f5f5f5] dark:bg-[#1a1a1a] p-3 text-sm text-[#111111]/70 dark:text-[#e5e5e5]/60">
                {missingTypeWarning}
              </div>
            )}

            {batterFile && renderPreview(batterFile)}
            {pitcherFile && renderPreview(pitcherFile)}

            {(isImportingEligibility || importError) && (
              <div className="mb-4 border-t border-[#111111]/10 dark:border-[#333333] pt-4 text-sm">
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
                            <span className="font-bold text-[#111111] dark:text-[#e5e5e5]">
                              Importing eligibility: {Math.round(progressWidth)}%
                            </span>
                            <span className="text-xs text-[#111111]/50 dark:text-[#e5e5e5]/40">
                              {importPlayer}
                            </span>
                          </div>
                          <div
                            className="h-1 w-full overflow-hidden bg-[#111111]/10 dark:bg-[#333333]"
                            style={{
                              backgroundImage:
                                "linear-gradient(to right, #dc2626, #dc2626)",
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
                      <p className="mt-2 text-xs text-[#111111]/60 dark:text-[#e5e5e5]/50">
                        {retryStatus}
                      </p>
                    )}
                  </>
                )}
                {importError && !isImportingEligibility && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#dc2626] dark:text-[#ef4444]">
                      {importError}
                    </span>
                    <button
                      onClick={() => void handleRetryImport()}
                      className="text-xs font-bold uppercase tracking-widest text-[#dc2626] dark:text-[#ef4444] hover:underline"
                    >
                      Retry Import
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-3 border-t border-[#111111]/10 dark:border-[#333333] pt-4">
              <button
                onClick={() => {
                  setBatterFile(null);
                  setPitcherFile(null);
                  setError(null);
                }}
                disabled={isImportingEligibility}
                className="text-xs font-bold uppercase tracking-widest text-[#111111]/50 dark:text-[#e5e5e5]/40 hover:text-[#111111] dark:hover:text-[#e5e5e5] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Back
              </button>
              <button
                onClick={handleConfirm}
                disabled={isImportingEligibility}
                className="rounded-sm bg-[#dc2626] dark:bg-[#ef4444] px-4 py-2 text-xs font-bold uppercase tracking-widest text-white hover:bg-[#b91c1c] dark:hover:bg-[#dc2626] disabled:cursor-not-allowed disabled:opacity-60"
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
