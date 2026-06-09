import type { IdSource, ProjectionGroup, ProjectionGroupSource, TwoWayPlayer, Player } from "@/types";

export const PUBLIC_DATASET_MANIFEST_KEY = "public-datasets/manifest.json";
export const DEFAULT_PUBLIC_DATASET_SLUG = "historical-2025";

export type PublicDatasetType = "historical-stats";

export type SeedProjectionGroupInput = {
  id: string;
  name: string;
  createdAt: string;
  batters: Player[];
  pitchers: Player[];
  twoWayPlayers: TwoWayPlayer[];
  batterIdSource: IdSource | null;
  pitcherIdSource: IdSource | null;
  eligibilityImportedAt?: string;
  eligibilitySeason?: number;
};

export type PublicDatasetManifestEntry = {
  slug: string;
  name: string;
  season: number;
  datasetType: PublicDatasetType;
  default: boolean;
};

export type PublicDatasetManifest = {
  datasets: PublicDatasetManifestEntry[];
};

export type PublicDatasetPayload = {
  slug: string;
  name: string;
  season: number;
  datasetType: PublicDatasetType;
  projectionGroup: SeedProjectionGroupInput;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPlayerArray(value: unknown): value is Player[] {
  return Array.isArray(value);
}

function assertManifestEntry(value: unknown, index: number): PublicDatasetManifestEntry {
  if (!isRecord(value)) {
    throw new Error(`Invalid manifest entry at index ${index}.`);
  }
  if (typeof value.slug !== "string" || value.slug.length === 0) {
    throw new Error(`Manifest entry ${index} is missing a valid slug.`);
  }
  if (typeof value.name !== "string" || value.name.length === 0) {
    throw new Error(`Manifest entry ${index} is missing a valid name.`);
  }
  if (!Number.isFinite(value.season)) {
    throw new Error(`Manifest entry ${index} is missing a valid season.`);
  }
  if (value.datasetType !== "historical-stats") {
    throw new Error(`Manifest entry ${index} has an unsupported datasetType.`);
  }
  if (typeof value.default !== "boolean") {
    throw new Error(`Manifest entry ${index} is missing a valid default flag.`);
  }
  return {
    slug: value.slug,
    name: value.name,
    season: Math.round(Number(value.season)),
    datasetType: value.datasetType,
    default: value.default,
  };
}

function assertSeedProjectionGroupInput(value: unknown): SeedProjectionGroupInput {
  if (!isRecord(value)) {
    throw new Error("Dataset projectionGroup must be an object.");
  }
  if (typeof value.id !== "string" || value.id.length === 0) {
    throw new Error("Dataset projectionGroup is missing a valid id.");
  }
  if (typeof value.name !== "string" || value.name.length === 0) {
    throw new Error("Dataset projectionGroup is missing a valid name.");
  }
  if (typeof value.createdAt !== "string" || value.createdAt.length === 0) {
    throw new Error("Dataset projectionGroup is missing a valid createdAt timestamp.");
  }
  if (!isPlayerArray(value.batters) || !isPlayerArray(value.pitchers) || !Array.isArray(value.twoWayPlayers)) {
    throw new Error("Dataset projectionGroup player arrays are invalid.");
  }

  return {
    id: value.id,
    name: value.name,
    createdAt: value.createdAt,
    batters: value.batters,
    pitchers: value.pitchers,
    twoWayPlayers: value.twoWayPlayers as TwoWayPlayer[],
    batterIdSource: (value.batterIdSource as IdSource | null | undefined) ?? null,
    pitcherIdSource: (value.pitcherIdSource as IdSource | null | undefined) ?? null,
    eligibilityImportedAt:
      typeof value.eligibilityImportedAt === "string" ? value.eligibilityImportedAt : undefined,
    eligibilitySeason:
      typeof value.eligibilitySeason === "number"
        ? Math.round(Number(value.eligibilitySeason))
        : undefined,
  };
}

export function parsePublicDatasetManifest(input: unknown): PublicDatasetManifest {
  if (!isRecord(input) || !Array.isArray(input.datasets)) {
    throw new Error("Public dataset manifest must contain a datasets array.");
  }
  const datasets = input.datasets.map(assertManifestEntry);
  const defaultCount = datasets.filter((dataset) => dataset.default).length;
  if (defaultCount !== 1) {
    throw new Error("Public dataset manifest must contain exactly one default dataset.");
  }
  return { datasets };
}

export function parsePublicDatasetPayload(input: unknown): PublicDatasetPayload {
  if (!isRecord(input)) {
    throw new Error("Public dataset payload must be an object.");
  }
  if (typeof input.slug !== "string" || input.slug.length === 0) {
    throw new Error("Public dataset payload is missing a valid slug.");
  }
  if (typeof input.name !== "string" || input.name.length === 0) {
    throw new Error("Public dataset payload is missing a valid name.");
  }
  if (!Number.isFinite(input.season)) {
    throw new Error("Public dataset payload is missing a valid season.");
  }
  if (input.datasetType !== "historical-stats") {
    throw new Error("Public dataset payload has an unsupported datasetType.");
  }

  return {
    slug: input.slug,
    name: input.name,
    season: Math.round(Number(input.season)),
    datasetType: input.datasetType,
    projectionGroup: assertSeedProjectionGroupInput(input.projectionGroup),
  };
}

export function createPublicDatasetSource(
  payload: Pick<PublicDatasetPayload, "slug" | "season" | "datasetType">,
  seededAt: string
): ProjectionGroupSource {
  return {
    kind: "public-dataset",
    slug: payload.slug,
    season: payload.season,
    datasetType: payload.datasetType,
    protected: true,
    seededAt,
  };
}

export function createProjectionGroupFromPublicDataset(
  payload: PublicDatasetPayload,
  seededAt = new Date().toISOString()
): ProjectionGroup {
  return {
    ...payload.projectionGroup,
    sport: "baseball",
    eligibilityImportSeason: payload.season,
    source: createPublicDatasetSource(payload, seededAt),
  };
}
