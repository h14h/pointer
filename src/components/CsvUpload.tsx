"use client";

import { useState, useCallback } from "react";
import {
  parsePlayerCSV,
  mergePlayers,
  extractBattingStats,
  extractPitchingStats,
  type ParseResult,
  type IdConfig,
  type IdSource,
} from "@/lib/csvParser";
import { useStore } from "@/store";
import type { BatterPlayer, PitcherPlayer, TwoWayPlayer } from "@/types";

interface CsvUploadProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CsvUpload({ isOpen, onClose }: CsvUploadProps) {
  const {
    setBatters,
    setPitchers,
    batters,
    pitchers,
    twoWayPlayers,
    setTwoWayPlayers,
    removeBattersByIds,
    removePitchersByIds,
  } = useStore();
  const [dragActive, setDragActive] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [uploadType, setUploadType] = useState<"auto" | "batter" | "pitcher">("auto");
  const [rawContent, setRawContent] = useState<string | null>(null);
  const [selectedIdSource, setSelectedIdSource] = useState<IdSource | "custom">("generated");
  const [customIdColumn, setCustomIdColumn] = useState<string>("");

  const handleFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setRawContent(content);
        const forceType = uploadType === "auto" ? undefined : uploadType;
        const result = parsePlayerCSV(content, forceType);
        setParseResult(result);
        if (result.needsIdSelection && result.availableColumns.length > 0) {
          setCustomIdColumn(result.availableColumns[0]);
        }
      };
      reader.readAsText(file);
    },
    [uploadType]
  );

  const handleIdSelection = useCallback(() => {
    if (!rawContent) return;
    const forceType = uploadType === "auto" ? undefined : uploadType;
    const idConfig: IdConfig =
      selectedIdSource === "custom"
        ? { source: "custom", customColumn: customIdColumn }
        : { source: selectedIdSource };
    const result = parsePlayerCSV(rawContent, forceType, idConfig);
    setParseResult(result);
  }, [rawContent, uploadType, selectedIdSource, customIdColumn]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleConfirm = () => {
    if (!parseResult) return;

    if (parseResult.type === "batter") {
      const incomingBatters = parseResult.players as BatterPlayer[];
      const twoWayMap = new Map(twoWayPlayers.map((player) => [player._id, player]));
      const battersForMerge: BatterPlayer[] = [];

      for (const batter of incomingBatters) {
        const existingTwoWay = twoWayMap.get(batter._id);
        if (existingTwoWay) {
          const updatedTwoWay: TwoWayPlayer = {
            ...existingTwoWay,
            Name: batter.Name || existingTwoWay.Name,
            Team: batter.Team || existingTwoWay.Team,
            PlayerId: batter.PlayerId || existingTwoWay.PlayerId,
            MLBAMID: batter.MLBAMID || existingTwoWay.MLBAMID,
            ADP: batter.ADP ?? existingTwoWay.ADP,
            _battingStats: {
              ...existingTwoWay._battingStats,
              ...extractBattingStats(batter),
            },
          };
          twoWayMap.set(batter._id, updatedTwoWay);
        } else {
          battersForMerge.push(batter);
        }
      }

      const { merged, remaining } = mergePlayers(battersForMerge, pitchers, "batter");
      const mergedTwoWay = merged as TwoWayPlayer[];
      const mergedIds = mergedTwoWay.map((player) => player._id);

      for (const player of mergedTwoWay) {
        twoWayMap.set(player._id, player);
      }

      setBatters(remaining);
      setTwoWayPlayers(Array.from(twoWayMap.values()));
      if (mergedIds.length > 0) {
        removePitchersByIds(mergedIds);
      }
    } else {
      const incomingPitchers = parseResult.players as PitcherPlayer[];
      const twoWayMap = new Map(twoWayPlayers.map((player) => [player._id, player]));
      const pitchersForMerge: PitcherPlayer[] = [];

      for (const pitcher of incomingPitchers) {
        const existingTwoWay = twoWayMap.get(pitcher._id);
        if (existingTwoWay) {
          const updatedTwoWay: TwoWayPlayer = {
            ...existingTwoWay,
            Name: pitcher.Name || existingTwoWay.Name,
            Team: pitcher.Team || existingTwoWay.Team,
            PlayerId: pitcher.PlayerId || existingTwoWay.PlayerId,
            MLBAMID: pitcher.MLBAMID || existingTwoWay.MLBAMID,
            ADP: pitcher.ADP ?? existingTwoWay.ADP,
            _pitchingStats: {
              ...existingTwoWay._pitchingStats,
              ...extractPitchingStats(pitcher),
            },
          };
          twoWayMap.set(pitcher._id, updatedTwoWay);
        } else {
          pitchersForMerge.push(pitcher);
        }
      }

      const { merged, remaining } = mergePlayers(pitchersForMerge, batters, "pitcher");
      const mergedTwoWay = merged as TwoWayPlayer[];
      const mergedIds = mergedTwoWay.map((player) => player._id);

      for (const player of mergedTwoWay) {
        twoWayMap.set(player._id, player);
      }

      setPitchers(remaining);
      setTwoWayPlayers(Array.from(twoWayMap.values()));
      if (mergedIds.length > 0) {
        removeBattersByIds(mergedIds);
      }
    }

    setParseResult(null);
    setRawContent(null);
    setSelectedIdSource("generated");
    setCustomIdColumn("");
    onClose();
  };

  const handleCancel = () => {
    setParseResult(null);
    setRawContent(null);
    setSelectedIdSource("generated");
    setCustomIdColumn("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-lg rounded-lg bg-white p-6 shadow-xl dark:bg-zinc-900">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Upload Player Projections
        </h2>

        {!parseResult ? (
          <>
            <div className="mb-4">
              <label className="mb-2 block text-sm text-zinc-600 dark:text-zinc-400">
                Player Type
              </label>
              <select
                value={uploadType}
                onChange={(e) =>
                  setUploadType(e.target.value as "auto" | "batter" | "pitcher")
                }
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
                Drag and drop a CSV/TSV file here
              </p>
              <p className="mb-3 text-xs text-zinc-500">or</p>
              <label className="cursor-pointer rounded-md bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700">
                Browse Files
                <input
                  type="file"
                  accept=".csv,.tsv,.txt"
                  onChange={handleChange}
                  className="hidden"
                />
              </label>
            </div>

            {(batters.length > 0 || pitchers.length > 0 || twoWayPlayers.length > 0) && (
              <p className="mb-4 text-sm text-zinc-500">
                Currently loaded: {batters.length} batters, {pitchers.length}{" "}
                pitchers, {twoWayPlayers.length} two-way
              </p>
            )}

            <div className="flex justify-end">
              <button
                onClick={handleCancel}
                className="rounded-md px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
            </div>
          </>
        ) : parseResult.needsIdSelection ? (
          <>
            <div className="mb-4 rounded-md bg-amber-50 p-4 dark:bg-amber-900/20">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                No MLBAMID or PlayerId column found
              </p>
              <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                Select a column to use as the unique player identifier, or generate IDs automatically.
              </p>
            </div>

            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                ID Source
              </label>
              <select
                value={selectedIdSource}
                onChange={(e) => setSelectedIdSource(e.target.value as IdSource | "custom")}
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              >
                <option value="generated">Generate IDs automatically</option>
                <option value="custom">Use a column from the file</option>
              </select>
            </div>

            {selectedIdSource === "custom" && (
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Select Column
                </label>
                <select
                  value={customIdColumn}
                  onChange={(e) => setCustomIdColumn(e.target.value)}
                  className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                >
                  {parseResult.availableColumns.map((col) => (
                    <option key={col} value={col}>
                      {col}
                    </option>
                  ))}
                </select>
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
            <div className="mb-4 rounded-md bg-zinc-50 p-4 dark:bg-zinc-800">
              <p className="text-sm text-zinc-700 dark:text-zinc-300">
                Detected:{" "}
                <span className="font-semibold">
                  {parseResult.rowCount} {parseResult.type}s
                </span>
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
            </div>

            <div className="mb-4">
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
                      <tr
                        key={p._id}
                        className="border-t border-zinc-100 dark:border-zinc-800"
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
                              {(
                                p as unknown as Record<string, number>
                              ).ERA?.toFixed(2)}
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setParseResult(null)}
                className="rounded-md px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                Back
              </button>
              <button
                onClick={handleConfirm}
                className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                Import {parseResult.rowCount} {parseResult.type}s
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
