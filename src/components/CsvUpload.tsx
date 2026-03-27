"use client";

import { useState, useCallback } from "react";
import {
  parsePlayerCSV,
  mergePlayers,
  type ParseResult,
  type IdConfig,
  type PitchingOutcomeStat,
} from "@/lib/csvParser";
import { isValidBaseballIp } from "@/lib/ipMath";
import {
  applyPitchingOutcomeEstimates,
  DEFAULT_PITCHING_OUTCOME_ESTIMATE_SELECTION,
  type PitchingOutcomeEstimateSelection,
} from "@/lib/pitchingOutcomeImport";
import { runProjectionEligibilityImport } from "@/lib/projectionEligibilityImport";
import { AppDialog } from "@/components/ui/AppDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { Input } from "@/components/ui/input";
import { MenuSelect } from "@/components/ui/MenuSelect";
import { Panel } from "@/components/ui/Panel";
import { Toggle } from "@/components/ui/Toggle";
import { useStore } from "@/store";
import type {
  TwoWayPlayer,
  IdSource,
  ProjectionGroup,
  Player,
  PitcherPlayer,
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

const PITCHING_OUTCOME_ORDER: PitchingOutcomeStat[] = ["QS", "CG", "ShO"];

const PITCHING_OUTCOME_LABELS: Record<PitchingOutcomeStat, string> = {
  QS: "Quality Starts (QS)",
  CG: "Complete Games (CG)",
  ShO: "Shutouts (ShO)",
};

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
  const [pitchingOutcomeSelection, setPitchingOutcomeSelection] =
    useState<PitchingOutcomeEstimateSelection>({
      ...DEFAULT_PITCHING_OUTCOME_ESTIMATE_SELECTION,
    });
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
        setPitchingOutcomeSelection({
          ...DEFAULT_PITCHING_OUTCOME_ESTIMATE_SELECTION,
        });
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
      return runProjectionEligibilityImport({
        group,
        season: group.eligibilityImportSeason ?? 2025,
        applyEligibilityForGroup,
        callbacks: {
          onStart: () => {
            setIsImportingEligibility(true);
            setImportProgress(0);
            setImportPlayer("");
            setImportError(null);
            setRetryStatus(null);
          },
          onProgress: setImportProgress,
          onPlayer: setImportPlayer,
          onRetryStatus: setRetryStatus,
          onError: setImportError,
          onComplete: () => {
            setIsImportingEligibility(false);
          },
        },
      });
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
    setPitchingOutcomeSelection({
      ...DEFAULT_PITCHING_OUTCOME_ESTIMATE_SELECTION,
    });
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
    const parsedPitchers = (pitcherFile?.parseResult.players ?? []) as PitcherPlayer[];
    const useBaseballIpForPitcherEstimates =
      parsedPitchers.length > 0 && parsedPitchers.every((pitcher) => isValidBaseballIp(pitcher.IP));
    const pitchers = applyPitchingOutcomeEstimates(
      parsedPitchers,
      pitcherFile?.parseResult.missingPitchingOutcomes ?? null,
      pitchingOutcomeSelection,
      useBaseballIpForPitcherEstimates
    ) as Player[];

    let twoWayPlayers: TwoWayPlayer[] = [];
    if (batters.length > 0 && pitchers.length > 0) {
      const { merged } = mergePlayers(batters, pitchers, "batter");
      twoWayPlayers = merged as TwoWayPlayer[];
    }

    const group: ProjectionGroup = {
      id: crypto.randomUUID(),
      name: trimmedName,
      createdAt: new Date().toISOString(),
      source: { kind: "upload" },
      batters,
      pitchers,
      twoWayPlayers,
      batterIdSource: batterFile?.parseResult.idSource ?? null,
      pitcherIdSource: pitcherFile?.parseResult.idSource ?? null,
      eligibilityImportSeason: 2025,
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

  const pitcherMissingOutcomes = pitcherFile?.parseResult.missingPitchingOutcomes ?? null;
  const missingPitchingOutcomeStats = pitcherMissingOutcomes
    ? PITCHING_OUTCOME_ORDER.flatMap((stat) => {
        const missingCount = pitcherMissingOutcomes[stat].missingPlayerIds.length;
        if (missingCount === 0) return [];
        return [
          {
            stat,
            missingCount,
            totalPlayers: pitcherMissingOutcomes[stat].totalPlayers,
          },
        ];
      })
    : [];
  const hasSelectedPitchingOutcomeEstimates = PITCHING_OUTCOME_ORDER.some(
    (stat) => pitchingOutcomeSelection[stat]
  );

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
          <FieldLabel className="mb-2 block" style={{ fontVariant: "small-caps" }}>
            Preview (first 5)
          </FieldLabel>
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
    <AppDialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleCancel();
      }}
      title="Upload Player Projections"
      contentClassName="font-sans"
    >
        {error && (
          <Panel tone="danger" padding="sm" className="mb-4 rounded-none text-sm text-[#dc2626] dark:text-[#ef4444]">
            {error}
          </Panel>
        )}

        {!batterFile && !pitcherFile ? (
          <>
            <div className="mb-5">
              <FieldLabel className="mb-2 block" style={{ fontVariant: "small-caps" }}>
                Player Type
              </FieldLabel>
              <MenuSelect
                value={uploadType}
                onChange={setUploadType}
                ariaLabel="Player Type"
                triggerClassName="w-full justify-between px-3 py-2 text-sm normal-case tracking-normal"
                menuClassName="w-full min-w-0"
                options={[
                  { value: "auto", label: "Auto-detect" },
                  { value: "batter", label: "Batters" },
                  { value: "pitcher", label: "Pitchers" },
                ]}
              />
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
              <Button variant="ghost" size="sm" onClick={handleCancel}>
                Cancel
              </Button>
            </div>
          </>
        ) : needsIdSelection ? (
          <>
            <Panel tone="muted" padding="md" className="mb-5 rounded-none border-l-4 border-l-[var(--color-border-strong)]">
              <p className="text-sm font-bold text-[#111111] dark:text-[#e5e5e5]">
                No MLBAMID or PlayerId column found
              </p>
              <p className="mt-1 text-sm text-[#111111]/60 dark:text-[#e5e5e5]/50">
                Select a column to use as the unique player identifier, or generate IDs automatically.
              </p>
            </Panel>

            {batterFile?.parseResult.needsIdSelection && (
              <div className="mb-5">
                <p className="mb-2 text-sm font-bold text-[#111111] dark:text-[#e5e5e5]">
                  Batter file: {batterFile.file.name}
                </p>
                <FieldLabel className="mb-2 block" style={{ fontVariant: "small-caps" }}>
                  ID Source
                </FieldLabel>
                <MenuSelect
                  value={batterFile.selectedIdSource}
                  onChange={(value) =>
                    setBatterFile({
                      ...batterFile,
                      selectedIdSource: value,
                    })
                  }
                  ariaLabel="Batter ID Source"
                  triggerClassName="w-full justify-between px-3 py-2 text-sm normal-case tracking-normal"
                  menuClassName="w-full min-w-0"
                  options={[
                    { value: "generated", label: "Generate IDs automatically" },
                    { value: "custom", label: "Use a column from the file" },
                  ]}
                />

                {batterFile.selectedIdSource === "custom" && (
                  <div className="mt-3">
                    <FieldLabel className="mb-2 block" style={{ fontVariant: "small-caps" }}>
                      Select Column
                    </FieldLabel>
                    <MenuSelect
                      value={batterFile.customIdColumn}
                      onChange={(value) =>
                        setBatterFile({ ...batterFile, customIdColumn: value })
                      }
                      ariaLabel="Batter ID Column"
                      triggerClassName="w-full justify-between px-3 py-2 text-sm normal-case tracking-normal"
                      menuClassName="w-full min-w-0"
                      options={batterFile.parseResult.availableColumns.map((col) => ({
                        value: col,
                        label: col,
                      }))}
                    />
                  </div>
                )}
              </div>
            )}

            {pitcherFile?.parseResult.needsIdSelection && (
              <div className="mb-5">
                <p className="mb-2 text-sm font-bold text-[#111111] dark:text-[#e5e5e5]">
                  Pitcher file: {pitcherFile.file.name}
                </p>
                <FieldLabel className="mb-2 block" style={{ fontVariant: "small-caps" }}>
                  ID Source
                </FieldLabel>
                <MenuSelect
                  value={pitcherFile.selectedIdSource}
                  onChange={(value) =>
                    setPitcherFile({
                      ...pitcherFile,
                      selectedIdSource: value,
                    })
                  }
                  ariaLabel="Pitcher ID Source"
                  triggerClassName="w-full justify-between px-3 py-2 text-sm normal-case tracking-normal"
                  menuClassName="w-full min-w-0"
                  options={[
                    { value: "generated", label: "Generate IDs automatically" },
                    { value: "custom", label: "Use a column from the file" },
                  ]}
                />

                {pitcherFile.selectedIdSource === "custom" && (
                  <div className="mt-3">
                    <FieldLabel className="mb-2 block" style={{ fontVariant: "small-caps" }}>
                      Select Column
                    </FieldLabel>
                    <MenuSelect
                      value={pitcherFile.customIdColumn}
                      onChange={(value) =>
                        setPitcherFile({ ...pitcherFile, customIdColumn: value })
                      }
                      ariaLabel="Pitcher ID Column"
                      triggerClassName="w-full justify-between px-3 py-2 text-sm normal-case tracking-normal"
                      menuClassName="w-full min-w-0"
                      options={pitcherFile.parseResult.availableColumns.map((col) => ({
                        value: col,
                        label: col,
                      }))}
                    />
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button variant="ghost" size="sm" onClick={handleCancel}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleIdSelection}>
                Continue
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="mb-5">
              <FieldLabel className="mb-2 block" style={{ fontVariant: "small-caps" }}>
                Group Name
              </FieldLabel>
              <Input
                type="text"
                value={groupName}
                onChange={(e) => {
                  setGroupName(e.target.value);
                  setGroupNameTouched(true);
                }}
                className="w-full"
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
                <Toggle
                  checked={importEligibilityEnabled}
                  onClick={() => {
                    if (!isImportingEligibility) {
                      setImportEligibilityEnabled(!importEligibilityEnabled);
                    }
                  }}
                  disabled={isImportingEligibility}
                  aria-label="Import Position Eligibility"
                  className="shrink-0"
                />
              </div>
              <p className="mt-2 text-xs text-[#111111]/30 dark:text-[#e5e5e5]/20">
                May take a minute for larger files.
              </p>
            </div>

            {missingPitchingOutcomeStats.length > 0 && (
              <div className="mb-5 border-t border-[#111111]/10 dark:border-[#333333] pt-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-[#111111] dark:text-[#e5e5e5]">
                      Estimate Missing Pitching Outcomes
                    </p>
                    <p className="mt-1 text-xs text-[#111111]/50 dark:text-[#e5e5e5]/40">
                      Missing values stay at zero unless selected below.
                    </p>
                  </div>
                  <Badge variant="neutral" className="rounded-sm px-2">Optional</Badge>
                </div>

                <div className="mt-3 space-y-2">
                  {missingPitchingOutcomeStats.map(
                    ({ stat, missingCount, totalPlayers }) => (
                      <label
                        key={stat}
                        className={`flex items-center justify-between gap-3 rounded-sm border p-3 transition-colors ${
                          pitchingOutcomeSelection[stat]
                            ? "border-[#dc2626]/40 bg-[#dc2626]/5 dark:border-[#ef4444]/40 dark:bg-[#ef4444]/10"
                            : "border-[#111111]/15 bg-[#f8f8f8] dark:border-[#333333] dark:bg-[#1a1a1a]"
                        } ${isImportingEligibility ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={pitchingOutcomeSelection[stat]}
                            onCheckedChange={(checked) =>
                              setPitchingOutcomeSelection((current) => ({
                                ...current,
                                [stat]: Boolean(checked),
                              }))
                            }
                            disabled={isImportingEligibility}
                            className="mt-0.5"
                          />
                          <div>
                            <p className="text-sm font-bold text-[#111111] dark:text-[#e5e5e5]">
                              {PITCHING_OUTCOME_LABELS[stat]}
                            </p>
                            <p className="mt-1 text-xs text-[#111111]/55 dark:text-[#e5e5e5]/45">
                              Missing for {missingCount} of {totalPlayers} pitchers
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#111111]/45 dark:text-[#e5e5e5]/35">
                          {pitchingOutcomeSelection[stat] ? "Estimate" : "Keep 0"}
                        </span>
                      </label>
                    )
                  )}
                </div>
              </div>
            )}

            {missingTypeWarning && (
              <Panel tone="muted" padding="sm" className="mb-4 rounded-none border-l-4 border-l-[var(--color-border-strong)] text-sm text-[#111111]/70 dark:text-[#e5e5e5]/60">
                {missingTypeWarning}
              </Panel>
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
                    <Button
                      variant="destructiveGhost"
                      size="sm"
                      onClick={() => void handleRetryImport()}
                      className="hover:underline"
                    >
                      Retry Import
                    </Button>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-3 border-t border-[#111111]/10 dark:border-[#333333] pt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setBatterFile(null);
                  setPitcherFile(null);
                  setError(null);
                  setPitchingOutcomeSelection({
                    ...DEFAULT_PITCHING_OUTCOME_ESTIMATE_SELECTION,
                  });
                }}
                disabled={isImportingEligibility}
              >
                Back
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirm}
                disabled={isImportingEligibility}
              >
                {isImportingEligibility
                  ? "Importing Group..."
                  : importEligibilityEnabled && hasSelectedPitchingOutcomeEstimates
                    ? "Import Group, Stats & Positions"
                    : importEligibilityEnabled
                      ? "Import Group & Positions"
                      : hasSelectedPitchingOutcomeEstimates
                        ? "Import Group & Stats"
                        : "Import Group"}
              </Button>
            </div>
          </>
        )}
    </AppDialog>
  );
}
