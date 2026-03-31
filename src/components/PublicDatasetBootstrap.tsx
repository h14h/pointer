"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { createProjectionGroupFromPublicDataset, type PublicDatasetManifest, type PublicDatasetPayload } from "@/lib/projections";
import { runProjectionEligibilityImport } from "@/lib/eligibility";
import type { ProjectionGroup } from "@/types";
import { useStore } from "@/store";
import { Button } from "@/components/ui/Button";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { Panel } from "@/components/ui/Panel";

type BootstrapStatus = "idle" | "loading-dataset" | "loading-eligibility" | "error";

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
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

  const protectedBaseline = useMemo(
    () =>
      projectionGroups.find(
        (group) => group.source.kind === "public-dataset" && group.source.protected
      ) ?? null,
    [projectionGroups]
  );
  const needsBaselineEligibility =
    protectedBaseline !== null && !protectedBaseline.eligibilityImportedAt;

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

  const loadDefaultDataset = useCallback(async () => {
    setStatus("loading-dataset");
    setErrorMessage(null);

    try {
      const manifest = await fetchJson<PublicDatasetManifest>("/api/public-datasets");
      const defaultDataset = manifest.datasets.find((dataset) => dataset.default) ?? manifest.datasets[0];

      if (!defaultDataset) {
        throw new Error("The built-in dataset catalog is empty.");
      }

      const payload = await fetchJson<PublicDatasetPayload>(
        `/api/public-datasets/${encodeURIComponent(defaultDataset.slug)}`
      );

      const group = createProjectionGroupFromPublicDataset(payload);
      seedProjectionGroup(group);
      attemptedEligibilityGroupIdRef.current = group.id;
      await importBuiltInEligibility(group);
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Unable to load the built-in 2025 Leaders dataset.");
    }
  }, [importBuiltInEligibility, seedProjectionGroup]);

  useEffect(() => {
    if (!hasHydrated || protectedBaseline || attemptedSeedRef.current) {
      return;
    }
    attemptedSeedRef.current = true;
    void loadDefaultDataset();
  }, [hasHydrated, loadDefaultDataset, protectedBaseline]);

  useEffect(() => {
    if (!hasHydrated || !protectedBaseline || !needsBaselineEligibility) {
      return;
    }
    if (attemptedEligibilityGroupIdRef.current === protectedBaseline.id) {
      return;
    }
    attemptedEligibilityGroupIdRef.current = protectedBaseline.id;
    void importBuiltInEligibility(protectedBaseline);
  }, [hasHydrated, importBuiltInEligibility, needsBaselineEligibility, protectedBaseline]);

  if (!hasHydrated || (protectedBaseline && status === "idle")) {
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
          <p className="text-sm text-[#111111]/70 dark:text-[#e5e5e5]/65">
            {status === "loading-dataset"
              ? "Fetching the built-in 2025 Leaders dataset from the public catalog."
              : "Applying 2025 position eligibility to the built-in leaders dataset."}
          </p>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <FieldLabel className="tracking-[0.18em] text-[#b45309] dark:text-[#f59e0b]">
              {protectedBaseline ? "Built-In Eligibility Unavailable" : "Built-In Dataset Unavailable"}
            </FieldLabel>
            <p className="text-sm text-[#111111]/70 dark:text-[#e5e5e5]/65">
              {errorMessage ??
                (protectedBaseline
                  ? "Unable to import position eligibility for 2025 Leaders."
                  : "Unable to load the built-in 2025 Leaders dataset.")}
            </p>
            {!hasAnyProjectionGroup ? (
              <p className="text-xs text-[#111111]/45 dark:text-[#e5e5e5]/40">
                You can retry now or upload your own projections to continue.
              </p>
            ) : protectedBaseline ? (
              <p className="text-xs text-[#111111]/45 dark:text-[#e5e5e5]/40">
                The leaders dataset is available now. You can retry the automatic import or re-run it later in Settings &gt; Projections.
              </p>
            ) : null}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (protectedBaseline) {
                attemptedEligibilityGroupIdRef.current = protectedBaseline.id;
                void importBuiltInEligibility(protectedBaseline);
                return;
              }
              attemptedSeedRef.current = true;
              void loadDefaultDataset();
            }}
          >
            Retry
          </Button>
        </div>
      )}
    </Panel>
  );
}
