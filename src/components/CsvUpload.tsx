"use client";

import { useState, useCallback } from "react";
import {
  parsePlayerCSV,
  mergePlayers,
  type ParseResult,
  type IdConfig,
} from "@/lib/csvParser";
import { useStore } from "@/store";
import type {
  TwoWayPlayer,
  IdSource,
  ProjectionGroup,
  Player,
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
  const { projectionGroups, addProjectionGroup } = useStore();
  const [dragActive, setDragActive] = useState(false);
  const [uploadType, setUploadType] = useState<UploadType>("auto");
  const [groupName, setGroupName] = useState("");
  const [groupNameTouched, setGroupNameTouched] = useState(false);
  const [batterFile, setBatterFile] = useState<UploadFileState | null>(null);
  const [pitcherFile, setPitcherFile] = useState<UploadFileState | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const resetState = () => {
    setBatterFile(null);
    setPitcherFile(null);
    setGroupName("");
    setGroupNameTouched(false);
    setError(null);
  };

  const handleCancel = () => {
    resetState();
    onClose();
  };

  const handleConfirm = () => {
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
      <div className="mb-4 rounded-md bg-zinc-50 p-4 dark:bg-zinc-800">
        <p className="text-sm text-zinc-700 dark:text-zinc-300">
          Detected: <span className="font-semibold">{parseResult.rowCount} {parseResult.type}s</span>
        </p>

        {parseResult.errors.length > 0 && (
          <div className="mt-2">
            <p className="text-sm font-medium text-amber-600">
              {parseResult.errors.length} warning(s):
            </p>
            <ul className="mt-1 max-h-20 overflow-y-auto text-xs text-amber-600">
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
          <p className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Preview (first 5):
          </p>
          <div className="max-h-40 overflow-y-auto rounded border border-zinc-200 dark:border-zinc-700">
            <table className="w-full text-xs">
              <thead className="bg-zinc-100 dark:bg-zinc-800">
                <tr>
                  <th className="px-2 py-1 text-left">Name</th>
                  <th className="px-2 py-1 text-left">Team</th>
                  {parseResult.type === "batter" ? (
                    <>
                      <th className="px-2 py-1 text-right">HR</th>
                      <th className="px-2 py-1 text-right">R</th>
                      <th className="px-2 py-1 text-right">RBI</th>
                    </>
                  ) : (
                    <>
                      <th className="px-2 py-1 text-right">W</th>
                      <th className="px-2 py-1 text-right">SO</th>
                      <th className="px-2 py-1 text-right">ERA</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {parseResult.players.slice(0, 5).map((p) => (
                  <tr key={p._id} className="border-t border-zinc-100 dark:border-zinc-800">
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-lg rounded-lg bg-white p-6 shadow-xl dark:bg-zinc-900">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Upload Player Projections
        </h2>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-200">
            {error}
          </div>
        )}

        {!batterFile && !pitcherFile ? (
          <>
            <div className="mb-4">
              <label className="mb-2 block text-sm text-zinc-600 dark:text-zinc-400">
                Player Type
              </label>
              <select
                value={uploadType}
                onChange={(e) => setUploadType(e.target.value as UploadType)}
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
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
              className={`mb-4 flex h-40 flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors ${
                dragActive
                  ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                  : "border-zinc-300 dark:border-zinc-700"
              }`}
            >
              <p className="mb-2 text-sm text-zinc-600 dark:text-zinc-400">
                Drag and drop CSV/TSV files here
              </p>
              <p className="mb-3 text-xs text-zinc-500">or</p>
              <label className="cursor-pointer rounded-md bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700">
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
                className="rounded-md px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
            </div>
          </>
        ) : needsIdSelection ? (
          <>
            <div className="mb-4 rounded-md bg-amber-50 p-4 dark:bg-amber-900/20">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                No MLBAMID or PlayerId column found
              </p>
              <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                Select a column to use as the unique player identifier, or generate IDs automatically.
              </p>
            </div>

            {batterFile?.parseResult.needsIdSelection && (
              <div className="mb-4">
                <p className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Batter file: {batterFile.file.name}
                </p>
                <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
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
                  className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                >
                  <option value="generated">Generate IDs automatically</option>
                  <option value="custom">Use a column from the file</option>
                </select>

                {batterFile.selectedIdSource === "custom" && (
                  <div className="mt-3">
                    <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Select Column
                    </label>
                    <select
                      value={batterFile.customIdColumn}
                      onChange={(e) =>
                        setBatterFile({ ...batterFile, customIdColumn: e.target.value })
                      }
                      className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
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
                <p className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Pitcher file: {pitcherFile.file.name}
                </p>
                <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
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
                  className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                >
                  <option value="generated">Generate IDs automatically</option>
                  <option value="custom">Use a column from the file</option>
                </select>

                {pitcherFile.selectedIdSource === "custom" && (
                  <div className="mt-3">
                    <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Select Column
                    </label>
                    <select
                      value={pitcherFile.customIdColumn}
                      onChange={(e) =>
                        setPitcherFile({ ...pitcherFile, customIdColumn: e.target.value })
                      }
                      className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
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
                className="rounded-md px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                onClick={handleIdSelection}
                className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                Continue
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Group Name
              </label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => {
                  setGroupName(e.target.value);
                  setGroupNameTouched(true);
                }}
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                placeholder="e.g. Steamer 2025"
              />
            </div>

            {missingTypeWarning && (
              <div className="mb-4 rounded-md bg-amber-50 p-3 text-sm text-amber-700 dark:bg-amber-900/20 dark:text-amber-200">
                {missingTypeWarning}
              </div>
            )}

            {batterFile && renderPreview(batterFile)}
            {pitcherFile && renderPreview(pitcherFile)}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setBatterFile(null);
                  setPitcherFile(null);
                  setError(null);
                }}
                className="rounded-md px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                Back
              </button>
              <button
                onClick={handleConfirm}
                className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                Import Group
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
