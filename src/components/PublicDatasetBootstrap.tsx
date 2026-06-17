"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import {
  createProjectionGroupFromPublicDataset,
  type PublicDatasetManifest,
  type PublicDatasetPayload,
} from "@/lib/projections";
import { runProjectionEligibilityImport } from "@/lib/eligibility";
import type { ProjectionGroup, Sport } from "@/types";
import { useStore } from "@/store";
import { Button } from "@/components/ui/Button";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { Panel } from "@/components/ui/Panel";

type BootstrapStatus = "idle" | "loading-dataset" | "loading-eligibility" | "error";

function hasDatasetPlayers(group: ProjectionGroup): boolean {
  return group.sport === "football"
    ? (group.footballPlayers?.length ?? 0) > 0
    : group.batters.length + group.pitchers.length + group.twoWayPlayers.length > 0;
}

// Datasets are plain static assets under /datasets (mirrored there by
// scripts/generate-public-dataset.ts) — no server handler, normal HTTP
// caching, zero backend compute for anonymous users.
async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Request failed for ${url}`);
  }
  return response.json() as Promise<T>;
}

export function PublicDatasetBootstrap() {
  const {
    hasHydrated,
    projectionGroups,
    seedProjectionGroup,
    applyEligibility,
  } = useStore(
    useShallow((state) => ({
      hasHydrated: state.hasHydrated,
      projectionGroups: state.projectionGroups,
      seedProjectionGroup: state.seedProjectionGroup,
      applyEligibility: state.applyEligibility,
    }))
  );
  const [status, setStatus] = useState<BootstrapStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const attemptedSeedRef = useRef(false);
  const attemptedEligibilityGroupIdRef = useRef<string | null>(null);

  const protectedBaselines = useMemo(
    () =>
      projectionGroups.filter(
        (group) => group.source.kind === "public-dataset" && group.source.protected
      ),
    [projectionGroups]
  );
  const baseballProtectedBaseline =
    protectedBaselines.find((group) => group.sport === "baseball") ?? null;
  const needsBaselineEligibility =
    baseballProtectedBaseline !== null && !baseballProtectedBaseline.eligibilityImportedAt;

  const importBuiltInEligibility = useCallback(
    async (group: ProjectionGroup) => {
      setStatus("loading-eligibility");
      setErrorMessage(null);

      const importSucceeded = await runProjectionEligibilityImport({
        group,
        season: group.eligibilityImportSeason ?? (group.source.kind === "public-dataset" ? group.source.season : 2025),
        applyEligibilityForGroup: applyEligibility,
        callbacks: {
          onError: (message) => {
            if (message) {
              setErrorMessage(message);
            }
          },
        },
      });

      if (importSucceeded) {
        setStatus("idle");
        return true;
      }

      setStatus("error");
      setErrorMessage((current) => current ?? "Unable to import position eligibility for 2025 Leaders.");
      return false;
    },
    [applyEligibility]
  );

  const loadDefaultDatasets = useCallback(async () => {
    setStatus("loading-dataset");
    setErrorMessage(null);

    try {
      const manifest = await fetchJson<PublicDatasetManifest>("/datasets/manifest.json");
      const existingSports = new Set<Sport>(
        protectedBaselines
          .filter(hasDatasetPlayers)
          .map((group) => (group.sport === "football" ? "football" : "baseball"))
      );
      const defaultDatasets = manifest.datasets
        .filter((dataset) => dataset.default)
        .filter((dataset) => !existingSports.has(dataset.sport));

      if (defaultDatasets.length === 0) {
        setStatus("idle");
        return;
      }

      const payloads = await Promise.all(
        defaultDatasets.map((dataset) =>
          fetchJson<PublicDatasetPayload>(`/datasets/${encodeURIComponent(dataset.slug)}.json`)
        )
      );

      let seededBaseballGroup: ProjectionGroup | null = null;
      for (const payload of payloads) {
        const group = createProjectionGroupFromPublicDataset(payload);
        seedProjectionGroup(group);
        if (group.sport === "baseball") {
          seededBaseballGroup = group;
        }
      }

      if (seededBaseballGroup) {
        attemptedEligibilityGroupIdRef.current = seededBaseballGroup.id;
        await importBuiltInEligibility(seededBaseballGroup);
      } else {
        setStatus("idle");
      }
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Unable to load the built-in prior-year datasets.");
    }
  }, [importBuiltInEligibility, protectedBaselines, seedProjectionGroup]);

  useEffect(() => {
    if (!hasHydrated || attemptedSeedRef.current) {
      return;
    }
    attemptedSeedRef.current = true;
    queueMicrotask(() => {
      void loadDefaultDatasets();
    });
  }, [hasHydrated, loadDefaultDatasets]);

  useEffect(() => {
    if (!hasHydrated || !baseballProtectedBaseline || !needsBaselineEligibility) {
      return;
    }
    if (attemptedEligibilityGroupIdRef.current === baseballProtectedBaseline.id) {
      return;
    }
    attemptedEligibilityGroupIdRef.current = baseballProtectedBaseline.id;
    queueMicrotask(() => {
      void importBuiltInEligibility(baseballProtectedBaseline);
    });
  }, [baseballProtectedBaseline, hasHydrated, importBuiltInEligibility, needsBaselineEligibility]);

  if (!hasHydrated || (protectedBaselines.length > 0 && status === "idle")) {
    return null;
  }

  if (status === "idle") {
    return null;
  }

  const hasAnyProjectionGroup = projectionGroups.length > 0;

  return (
    <Panel
      as="section"
      aria-live="polite"
      tone={status === "error" ? "warning" : "default"}
      padding="md"
      className="mx-auto mb-6 max-w-5xl px-5 py-4 font-sans shadow-sm"
    >
      {status === "loading-dataset" || status === "loading-eligibility" ? (
        <div className="space-y-1">
          <FieldLabel className="tracking-[0.18em]">
            {status === "loading-dataset" ? "Loading Built-In Dataset" : "Importing Eligibility"}
          </FieldLabel>
          <p className="text-sm text-[var(--color-fg-muted)]">
            {status === "loading-dataset"
              ? "Fetching the built-in 2025 Leaders dataset from the public catalog."
              : "Applying 2025 position eligibility to the built-in leaders dataset."}
          </p>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <FieldLabel className="tracking-[0.18em] text-[var(--color-warning)]">
              {baseballProtectedBaseline ? "Built-In Eligibility Unavailable" : "Built-In Dataset Unavailable"}
            </FieldLabel>
            <p className="text-sm text-[var(--color-fg-muted)]">
              {errorMessage ??
                (baseballProtectedBaseline
                  ? "Unable to import position eligibility for 2025 Leaders."
                  : "Unable to load the built-in prior-year datasets.")}
            </p>
            {!hasAnyProjectionGroup ? (
              <p className="text-xs text-[var(--color-fg-subtle)]">
                You can retry now or upload your own projections to continue.
              </p>
            ) : baseballProtectedBaseline ? (
              <p className="text-xs text-[var(--color-fg-subtle)]">
                The leaders dataset is available now. You can retry the automatic import or re-run it later from your league&apos;s Intel tab.
              </p>
            ) : null}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (baseballProtectedBaseline) {
                attemptedEligibilityGroupIdRef.current = baseballProtectedBaseline.id;
                void importBuiltInEligibility(baseballProtectedBaseline);
                return;
              }
              attemptedSeedRef.current = true;
              void loadDefaultDatasets();
            }}
          >
            Retry
          </Button>
        </div>
      )}
    </Panel>
  );
}
