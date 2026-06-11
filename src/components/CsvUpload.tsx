"use client";

import { useState, useCallback } from "react";
import {
  parsePlayerCSV,
  mergePlayers,
  type ParseResult,
  type IdConfig,
  type PitchingOutcomeStat,
  applyPitchingOutcomeEstimates,
  DEFAULT_PITCHING_OUTCOME_ESTIMATE_SELECTION,
  type PitchingOutcomeEstimateSelection,
} from "@/lib/projections";
import { isValidBaseballIp } from "@/lib/scoring";
import { runProjectionEligibilityImport } from "@/lib/eligibility";
import { AppDialog } from "@/components/ui/AppDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { Input } from "@/components/ui/input";
import { Dropdown } from "@/components/ui/Dropdown";
import { randomUUID } from "@/lib/uuid";
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
  const { projectionGroups, addProjectionGroup, applyEligibility } = useStore();
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
        applyEligibilityForGroup: applyEligibility,
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
    [applyEligibility]
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
      id: randomUUID(),
      name: trimmedName,
      createdAt: new Date().toISOString(),
      sport: "baseball",
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
      <div className="mb-5 border-t border-[var(--color-border-soft)] pt-4">
        <p className="font-data text-sm text-[var(--color-fg-default)]">
          Detected: <span className="font-semibold">{parseResult.rowCount} {parseResult.type}s</span>
        </p>

        {parseResult.errors.length > 0 && (
          <div className="mt-2">
            <p className="text-sm font-bold text-[var(--color-warning)]">
              {parseResult.errors.length} warning(s):
            </p>
            <ul className="font-data mt-1 max-h-20 overflow-y-auto text-xs text-[var(--color-warning)]">
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
          <FieldLabel className="mb-2 block">
            Preview (first 5)
          </FieldLabel>
          <div className="max-h-40 overflow-y-auto">
            <table className="font-data w-full text-xs text-[var(--color-fg-default)]">
              <thead>
                <tr className="border-b border-[var(--color-border-strong)]">
                  <th className="stamp px-2 py-1 text-left">Name</th>
                  <th className="stamp px-2 py-1 text-left">Team</th>
                  {parseResult.type === "batter" ? (
                    <>
                      <th className="stamp px-2 py-1 text-right">HR</th>
                      <th className="stamp px-2 py-1 text-right">R</th>
                      <th className="stamp px-2 py-1 text-right">RBI</th>
                    </>
                  ) : (
                    <>
                      <th className="stamp px-2 py-1 text-right">W</th>
                      <th className="stamp px-2 py-1 text-right">SO</th>
                      <th className="stamp px-2 py-1 text-right">ERA</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {parseResult.players.slice(0, 5).map((p) => (
                  <tr
                    key={p._id}
                    className="border-b border-[var(--color-border-soft)]"
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
      description={
        <span className="stamp">
          source intake — baseball library, shared by every baseball league
        </span>
      }
      contentClassName="font-sans"
    >
        {error && (
          <Panel tone="danger" padding="sm" className="mb-4 rounded-none text-sm text-[var(--color-danger)]">
            {error}
          </Panel>
        )}

        {!batterFile && !pitcherFile ? (
          <>
            <div className="mb-5">
              <FieldLabel className="mb-2 block">
                Player Type
              </FieldLabel>
              <Dropdown
                value={uploadType}
                onChange={setUploadType}
                ariaLabel="Player Type"
                fullWidth
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
              className={`mb-5 flex h-40 flex-col items-center justify-center gap-4 rounded-[var(--radius-sm)] border-2 border-dashed transition-colors ${
                dragActive
                  ? "border-[var(--color-accent)] bg-[color:color-mix(in_srgb,var(--color-accent)_5%,transparent)]"
                  : "border-[var(--color-border-default)] bg-[var(--color-surface-base)]"
              }`}
            >
              <p className="stamp">drop a csv or tsv here — or browse</p>
              <label className="cursor-pointer rounded-sm border border-[var(--color-border-default)] bg-[var(--color-surface-base)] px-4 py-2 text-xs font-bold uppercase tracking-widest text-[var(--color-fg-muted)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-fg-default)]">
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
              <p className="text-sm font-bold text-[var(--color-fg-default)]">
                No MLBAMID or PlayerId column found
              </p>
              <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
                Select a column to use as the unique player identifier, or generate IDs automatically.
              </p>
            </Panel>

            {batterFile?.parseResult.needsIdSelection && (
              <div className="mb-5">
                <p className="font-data mb-2 truncate text-sm font-semibold text-[var(--color-fg-default)]">
                  Batter file: {batterFile.file.name}
                </p>
                <FieldLabel className="mb-2 block">
                  ID Source
                </FieldLabel>
                <Dropdown
                  value={batterFile.selectedIdSource}
                  onChange={(value) =>
                    setBatterFile({
                      ...batterFile,
                      selectedIdSource: value,
                    })
                  }
                  ariaLabel="Batter ID Source"
                  fullWidth
                  menuClassName="w-full min-w-0"
                  options={[
                    { value: "generated", label: "Generate IDs automatically" },
                    { value: "custom", label: "Use a column from the file" },
                  ]}
                />

                {batterFile.selectedIdSource === "custom" && (
                  <div className="mt-3">
                    <FieldLabel className="mb-2 block">
                      Select Column
                    </FieldLabel>
                    <Dropdown
                      value={batterFile.customIdColumn}
                      onChange={(value) =>
                        setBatterFile({ ...batterFile, customIdColumn: value })
                      }
                      ariaLabel="Batter ID Column"
                      fullWidth
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
                <p className="font-data mb-2 truncate text-sm font-semibold text-[var(--color-fg-default)]">
                  Pitcher file: {pitcherFile.file.name}
                </p>
                <FieldLabel className="mb-2 block">
                  ID Source
                </FieldLabel>
                <Dropdown
                  value={pitcherFile.selectedIdSource}
                  onChange={(value) =>
                    setPitcherFile({
                      ...pitcherFile,
                      selectedIdSource: value,
                    })
                  }
                  ariaLabel="Pitcher ID Source"
                  fullWidth
                  menuClassName="w-full min-w-0"
                  options={[
                    { value: "generated", label: "Generate IDs automatically" },
                    { value: "custom", label: "Use a column from the file" },
                  ]}
                />

                {pitcherFile.selectedIdSource === "custom" && (
                  <div className="mt-3">
                    <FieldLabel className="mb-2 block">
                      Select Column
                    </FieldLabel>
                    <Dropdown
                      value={pitcherFile.customIdColumn}
                      onChange={(value) =>
                        setPitcherFile({ ...pitcherFile, customIdColumn: value })
                      }
                      ariaLabel="Pitcher ID Column"
                      fullWidth
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
              <FieldLabel className="mb-2 block">
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

            <div className="mb-5 border-t border-[var(--color-border-soft)] pt-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-[var(--color-fg-default)]">
                    Import Position Eligibility
                  </p>
                  <p className="mt-1 text-xs text-[var(--color-fg-muted)]">
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
              <p className="mt-2 text-xs text-[var(--color-fg-subtle)]">
                May take a minute for larger files.
              </p>
            </div>

            {missingPitchingOutcomeStats.length > 0 && (
              <div className="mb-5 border-t border-[var(--color-border-soft)] pt-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-[var(--color-fg-default)]">
                      Estimate Missing Pitching Outcomes
                    </p>
                    <p className="mt-1 text-xs text-[var(--color-fg-muted)]">
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
                            ? "border-[color:color-mix(in_srgb,var(--color-accent)_35%,transparent)] bg-[color:color-mix(in_srgb,var(--color-accent)_5%,transparent)]"
                            : "border-[var(--color-border-soft)] bg-[var(--color-surface-muted)]"
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
                            <p className="text-sm font-bold text-[var(--color-fg-default)]">
                              {PITCHING_OUTCOME_LABELS[stat]}
                            </p>
                            <p className="font-data mt-1 text-xs text-[var(--color-warning)]">
                              Missing for {missingCount} of {totalPlayers} pitchers
                            </p>
                          </div>
                        </div>
                        <span
                          className={`font-data text-[10px] font-medium uppercase tracking-[0.12em] ${
                            pitchingOutcomeSelection[stat]
                              ? "text-[var(--color-accent)]"
                              : "text-[var(--color-fg-subtle)]"
                          }`}
                        >
                          {pitchingOutcomeSelection[stat] ? "Estimate" : "Keep 0"}
                        </span>
                      </label>
                    )
                  )}
                </div>
              </div>
            )}

            {missingTypeWarning && (
              <Panel tone="warning" padding="sm" className="mb-4 rounded-none text-sm text-[var(--color-warning)]">
                {missingTypeWarning}
              </Panel>
            )}

            {batterFile && renderPreview(batterFile)}
            {pitcherFile && renderPreview(pitcherFile)}

            {(isImportingEligibility || importError) && (
              <div className="mb-4 border-t border-[var(--color-border-soft)] pt-4 text-sm">
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
                            <span className="font-data font-semibold text-[var(--color-fg-default)]">
                              Importing eligibility: {Math.round(progressWidth)}%
                            </span>
                            <span className="font-data text-xs text-[var(--color-fg-muted)]">
                              {importPlayer}
                            </span>
                          </div>
                          <div
                            className="h-1 w-full overflow-hidden bg-[var(--color-border-soft)]"
                            style={{
                              backgroundImage:
                                "linear-gradient(to right, var(--color-accent), var(--color-accent))",
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
                      <p className="mt-2 text-xs text-[var(--color-fg-muted)]">
                        {retryStatus}
                      </p>
                    )}
                  </>
                )}
                {importError && !isImportingEligibility && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[var(--color-danger)]">
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

            <div className="flex justify-end gap-3 border-t border-[var(--color-border-soft)] pt-4">
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
