"use client";

import { useState } from "react";
import { runProjectionEligibilityImport } from "@/lib/eligibility";
import { getProjectionGroupDisplayName } from "@/lib/projections";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { useStore } from "@/store";
import type { ProjectionGroup } from "@/types";

/**
 * Shared eligibility-import machinery for the Intel tab, ported from the
 * legacy ProjectionsSection: one import runs at a time across the whole
 * library, with progress/retry/error readouts scoped to the running group.
 */
export interface EligibilityImportState {
  activeGroupId: string | null;
  progress: number;
  player: string;
  retryStatus: string | null;
  error: { groupId: string; message: string } | null;
  run: (group: ProjectionGroup) => Promise<void>;
}

export function useEligibilityImport(): EligibilityImportState {
  const { applyEligibility } = useStore();
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [player, setPlayer] = useState("");
  const [retryStatus, setRetryStatus] = useState<string | null>(null);
  const [error, setError] = useState<{ groupId: string; message: string } | null>(null);

  const run = async (group: ProjectionGroup) => {
    await runProjectionEligibilityImport({
      group,
      season: group.eligibilityImportSeason ?? 2025,
      applyEligibilityForGroup: applyEligibility,
      callbacks: {
        onStart: () => {
          setActiveGroupId(group.id);
          setProgress(0);
          setPlayer("");
          setRetryStatus(null);
          setError(null);
        },
        onProgress: setProgress,
        onPlayer: setPlayer,
        onRetryStatus: setRetryStatus,
        onError: (message) => {
          if (message) setError({ groupId: group.id, message });
        },
        onComplete: () => {
          setActiveGroupId(null);
        },
      },
    });
  };

  return { activeGroupId, progress, player, retryStatus, error, run };
}

interface EligibilityImportControlProps {
  group: ProjectionGroup;
  importState: EligibilityImportState;
}

/**
 * Per-source eligibility import row (baseball only): season input plus the
 * import/re-run action, with live progress while a run is underway.
 */
export function EligibilityImportControl({ group, importState }: EligibilityImportControlProps) {
  const { setProjectionGroupEligibilityImportSeason } = useStore();
  const isImporting = importState.activeGroupId === group.id;
  const errorMessage = importState.error?.groupId === group.id ? importState.error.message : null;
  const importSeason = group.eligibilityImportSeason ?? 2025;
  const displayName = getProjectionGroupDisplayName(group);

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="stamp">eligibility season</span>
        <Input
          type="number"
          inputSize="sm"
          defaultValue={importSeason}
          min={1900}
          step={1}
          onBlur={(event) => {
            const parsed = Number(event.target.value);
            if (Number.isFinite(parsed) && parsed > 0) {
              setProjectionGroupEligibilityImportSeason(group.id, parsed);
            }
          }}
          className="font-data w-24"
          aria-label={`Eligibility season for ${displayName}`}
        />
        <Button
          variant="secondary"
          size="sm"
          disabled={importState.activeGroupId !== null}
          onClick={() => void importState.run(group)}
        >
          {group.eligibilityImportedAt ? "Re-run eligibility" : "Import eligibility"}
        </Button>
      </div>
      {isImporting ? (
        <p className="font-data mt-2 text-[11px] text-[var(--color-fg-muted)]">
          {importState.progress}% complete
          {importState.player ? ` · ${importState.player}` : ""}
          {importState.retryStatus ? ` · ${importState.retryStatus}` : ""}
        </p>
      ) : null}
      {errorMessage ? (
        <p className="mt-2 text-xs text-[var(--color-warning)]">{errorMessage}</p>
      ) : null}
    </div>
  );
}
