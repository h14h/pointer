"use client";

import { useCallback, useState } from "react";
import {
  mergeFootballPlayers,
  parseFootballCsv,
  type FootballParseResult,
} from "@/lib/football";
import { AppDialog } from "@/components/ui/AppDialog";
import { Button } from "@/components/ui/Button";
import { Dropdown } from "@/components/ui/Dropdown";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/Panel";
import { randomUUID } from "@/lib/uuid";
import { useStore } from "@/store";
import type { FootballPlayer, FootballPosition, ProjectionGroup } from "@/types";

interface FootballCsvUploadProps {
  isOpen: boolean;
  onClose: () => void;
}

type PositionChoice = FootballPosition | "unselected";

type UploadFileState = {
  file: File;
  content: string;
  parseResult: FootballParseResult;
  positionChoice: PositionChoice;
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
  return `Football Projections ${groupCount + 1}`;
}

const POSITION_OPTIONS: { value: FootballPosition; label: string }[] = [
  { value: "QB", label: "Quarterbacks (QB)" },
  { value: "RB", label: "Running Backs (RB)" },
  { value: "WR", label: "Wide Receivers (WR)" },
  { value: "TE", label: "Tight Ends (TE)" },
  { value: "K", label: "Kickers (K)" },
  { value: "DST", label: "Defense / Special Teams (D/ST)" },
];

export function FootballCsvUpload({ isOpen, onClose }: FootballCsvUploadProps) {
  const { projectionGroups, addProjectionGroup } = useStore();
  const [dragActive, setDragActive] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupNameTouched, setGroupNameTouched] = useState(false);
  const [files, setFiles] = useState<UploadFileState[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = useCallback(
    async (incoming: FileList | File[]) => {
      const fileArray = Array.from(incoming);
      if (fileArray.length === 0) return;

      setError(null);

      try {
        const contents = await Promise.all(fileArray.map((file) => readFile(file)));
        const nextFiles: UploadFileState[] = fileArray.map((file, i) => ({
          file,
          content: contents[i],
          parseResult: parseFootballCsv(contents[i]),
          positionChoice: "unselected",
        }));

        if (!groupNameTouched) {
          setGroupName(suggestGroupName(fileArray[0]?.name, projectionGroups.length));
        }

        setFiles((current) => [...current, ...nextFiles]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to read files");
      }
    },
    [groupNameTouched, projectionGroups.length],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      if (e.dataTransfer.files.length > 0) {
        void handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const fileList = e.target.files;
      if (fileList && fileList.length > 0) {
        void handleFiles(fileList);
      }
    },
    [handleFiles],
  );

  const setFilePosition = (index: number, position: FootballPosition) => {
    setFiles((current) =>
      current.map((fileState, i) => {
        if (i !== index) return fileState;
        return {
          ...fileState,
          positionChoice: position,
          parseResult: parseFootballCsv(fileState.content, { forcePosition: position }),
        };
      }),
    );
  };

  const removeFile = (index: number) => {
    setFiles((current) => current.filter((_, i) => i !== index));
  };

  const resetState = () => {
    setFiles([]);
    setGroupName("");
    setGroupNameTouched(false);
    setError(null);
  };

  const handleCancel = () => {
    resetState();
    onClose();
  };

  const pendingPositionSelection = files.some(
    (fileState) => fileState.parseResult.needsPositionSelection,
  );

  const handleConfirm = () => {
    setError(null);

    const trimmedName = groupName.trim();
    if (!trimmedName) {
      setError("Group name is required.");
      return;
    }
    if (files.length === 0) {
      setError("Please upload at least one CSV file.");
      return;
    }
    if (pendingPositionSelection) {
      setError("Select a position for each file that needs one.");
      return;
    }

    let footballPlayers: FootballPlayer[] = [];
    for (const fileState of files) {
      footballPlayers = mergeFootballPlayers(footballPlayers, fileState.parseResult.players);
    }

    if (footballPlayers.length === 0) {
      setError("No players could be parsed from the uploaded file(s).");
      return;
    }

    const group: ProjectionGroup = {
      id: randomUUID(),
      name: trimmedName,
      createdAt: new Date().toISOString(),
      sport: "football",
      source: { kind: "upload" },
      batters: [],
      pitchers: [],
      twoWayPlayers: [],
      footballPlayers,
      batterIdSource: null,
      pitcherIdSource: null,
    };

    addProjectionGroup(group);
    resetState();
    onClose();
  };

  if (!isOpen) return null;

  const totalPlayers = files.reduce(
    (sum, fileState) => sum + fileState.parseResult.players.length,
    0,
  );

  return (
    <AppDialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleCancel();
      }}
      title="Upload Football Projections"
      contentClassName="font-sans"
    >
      {error && (
        <Panel
          tone="danger"
          padding="sm"
          className="mb-4 rounded-none text-sm text-[#dc2626] dark:text-[#ef4444]"
        >
          {error}
        </Panel>
      )}

      {files.length === 0 ? (
        <>
          <p className="mb-4 text-sm text-[#111111]/70 dark:text-[#e5e5e5]/60">
            Upload one combined CSV with a position column, or several per-position files
            (QB, RB, WR, TE, K, D/ST) — they merge into a single projection group.
          </p>

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
              placeholder="e.g. FantasyPros 2026"
            />
          </div>

          {files.map((fileState, index) => {
            const { parseResult } = fileState;
            const needsPosition = parseResult.needsPositionSelection;

            return (
              <div
                key={`${fileState.file.name}-${index}`}
                className="mb-5 border-t border-[#111111]/10 dark:border-[#333333] pt-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[#111111] dark:text-[#e5e5e5]">
                      {fileState.file.name}
                    </p>
                    <p className="mt-1 text-sm text-[#111111]/60 dark:text-[#e5e5e5]/50">
                      {needsPosition
                        ? "Position required"
                        : `${parseResult.players.length} players` +
                          (parseResult.detectedPosition
                            ? ` (detected: ${parseResult.detectedPosition})`
                            : "")}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removeFile(index)}>
                    Remove
                  </Button>
                </div>

                {(needsPosition || !parseResult.availableColumns.some((c) => /^pos/i.test(c.trim()))) && (
                  <div className="mt-3">
                    <FieldLabel className="mb-2 block" style={{ fontVariant: "small-caps" }}>
                      Position in this file
                    </FieldLabel>
                    <Dropdown
                      value={
                        fileState.positionChoice === "unselected"
                          ? (parseResult.detectedPosition ?? "unselected")
                          : fileState.positionChoice
                      }
                      onChange={(value) => {
                        if (value !== "unselected") {
                          setFilePosition(index, value as FootballPosition);
                        }
                      }}
                      ariaLabel={`Position for ${fileState.file.name}`}
                      fullWidth
                      menuClassName="w-full min-w-0"
                      options={[
                        ...(needsPosition && fileState.positionChoice === "unselected"
                          ? [{ value: "unselected", label: "Select a position..." }]
                          : []),
                        ...POSITION_OPTIONS,
                      ]}
                    />
                  </div>
                )}

                {parseResult.warnings.length > 0 && (
                  <ul className="mt-2 text-xs text-[#111111]/60 dark:text-[#e5e5e5]/50">
                    {parseResult.warnings.slice(0, 3).map((warning, i) => (
                      <li key={i}>{warning}</li>
                    ))}
                  </ul>
                )}

                {parseResult.players.length > 0 && (
                  <div className="mt-3 max-h-40 overflow-y-auto">
                    <table className="w-full text-xs text-[#111111] dark:text-[#e5e5e5]">
                      <thead>
                        <tr className="border-b-2 border-[#111111] dark:border-[#e5e5e5]">
                          <th className="px-2 py-1 text-left text-[10px] font-bold uppercase tracking-widest">
                            Name
                          </th>
                          <th className="px-2 py-1 text-left text-[10px] font-bold uppercase tracking-widest">
                            Team
                          </th>
                          <th className="px-2 py-1 text-left text-[10px] font-bold uppercase tracking-widest">
                            Pos
                          </th>
                          <th className="px-2 py-1 text-right text-[10px] font-bold uppercase tracking-widest">
                            Yds
                          </th>
                          <th className="px-2 py-1 text-right text-[10px] font-bold uppercase tracking-widest">
                            TD
                          </th>
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
                            <td className="px-2 py-1.5">{p.Position}</td>
                            <td className="px-2 py-1.5 text-right">
                              {Math.round(p.PASS_YDS + p.RUSH_YDS + p.REC_YDS)}
                            </td>
                            <td className="px-2 py-1.5 text-right">
                              {Math.round(p.PASS_TD + p.RUSH_TD + p.REC_TD + p.DST_TD)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}

          <div className="mb-5 border-t border-[#111111]/10 dark:border-[#333333] pt-4">
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-[#111111]/70 dark:text-[#e5e5e5]/60">
              <span className="rounded-sm border border-[#111111]/20 px-3 py-1.5 text-xs font-bold uppercase tracking-widest hover:bg-[#111111]/5 dark:border-[#333333] dark:hover:bg-[#e5e5e5]/5">
                Add Another File
              </span>
              <input
                type="file"
                accept=".csv,.tsv,.txt"
                multiple
                onChange={handleChange}
                className="hidden"
              />
            </label>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-[#111111]/10 dark:border-[#333333] pt-4">
            <span className="text-xs text-[#111111]/50 dark:text-[#e5e5e5]/40">
              {totalPlayers} players total
            </span>
            <div className="flex gap-3">
              <Button variant="ghost" size="sm" onClick={handleCancel}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleConfirm} disabled={pendingPositionSelection}>
                Import Group
              </Button>
            </div>
          </div>
        </>
      )}
    </AppDialog>
  );
}
