import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvConfig } from "@next/env";
import {
  mergePlayers,
  parsePlayerCSV,
  parsePublicDatasetManifest,
  type PublicDatasetManifest,
  type PublicDatasetManifestEntry,
  type PublicDatasetPayload,
} from "@/lib/projections";
import { parseFootballCsv } from "@/lib/football";
import type { Sport, TwoWayPlayer } from "@/types";

loadEnvConfig(process.cwd());

const DATASET_DIR = path.join(process.cwd(), "data", "public-datasets");
const MANIFEST_PATH = path.join(DATASET_DIR, "manifest.json");

type GenerateOptions = {
  sport: Sport;
  battersPath: string | null;
  pitchersPath: string | null;
  footballPath: string | null;
  slug: string;
  datasetName: string;
  projectionGroupName: string;
  season: number;
  outputPath: string;
  setDefault: boolean;
};

function getArgValue(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index === -1) return null;
  return args[index + 1] ?? null;
}

function hasFlag(args: string[], flag: string): boolean {
  return args.includes(flag);
}

function getRequiredArg(args: string[], flag: string): string {
  const value = getArgValue(args, flag);
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing required argument: ${flag}`);
  }
  return value;
}

function parseGenerateOptions(args: string[]): GenerateOptions {
  const slug = getRequiredArg(args, "--slug");
  const season = Number(getRequiredArg(args, "--season"));
  if (!Number.isFinite(season)) {
    throw new Error("`--season` must be a number.");
  }

  const sport = (getArgValue(args, "--sport") ?? "baseball") as Sport;
  if (sport !== "baseball" && sport !== "football") {
    throw new Error("`--sport` must be either baseball or football.");
  }
  const battersPath = getArgValue(args, "--batters");
  const pitchersPath = getArgValue(args, "--pitchers");
  const footballPath = getArgValue(args, "--football");

  if (sport === "baseball" && (!battersPath || !pitchersPath)) {
    throw new Error("Baseball datasets require --batters and --pitchers.");
  }
  if (sport === "football" && !footballPath) {
    throw new Error("Football datasets require --football.");
  }

  return {
    sport,
    battersPath,
    pitchersPath,
    footballPath,
    slug,
    datasetName: getArgValue(args, "--dataset-name") ?? `${season} Prior-Year Baseline`,
    projectionGroupName: getArgValue(args, "--group-name") ?? `${season} Prior-Year Stats`,
    season: Math.round(season),
    outputPath:
      getArgValue(args, "--out") ?? path.join(DATASET_DIR, `${slug}.json`),
    setDefault: hasFlag(args, "--default"),
  };
}

async function readManifest(): Promise<PublicDatasetManifest> {
  try {
    const manifestContent = await readFile(MANIFEST_PATH, "utf8");
    return parsePublicDatasetManifest(JSON.parse(manifestContent));
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    if (message.includes("enoent")) {
      return { datasets: [] };
    }
    throw error;
  }
}

export function buildManifest(
  manifest: PublicDatasetManifest,
  entry: PublicDatasetManifestEntry,
  setDefault: boolean
) {
  const withoutSlug = manifest.datasets.filter((dataset) => dataset.slug !== entry.slug);
  const nextDatasets = [...withoutSlug, entry].sort((left, right) => left.slug.localeCompare(right.slug));

  const shouldSetDefault =
    setDefault ||
    nextDatasets
      .filter((dataset) => dataset.sport === entry.sport)
      .every((dataset) => !dataset.default);

  return {
    datasets: nextDatasets.map((dataset) => ({
      ...dataset,
      default:
        dataset.sport === entry.sport && shouldSetDefault
          ? dataset.slug === entry.slug
          : dataset.default,
    })),
  } satisfies PublicDatasetManifest;
}

export async function generatePublicDataset(options: GenerateOptions): Promise<PublicDatasetPayload> {
  if (options.sport === "football") {
    if (!options.footballPath) {
      throw new Error("Football datasets require --football.");
    }
    const footballContent = await readFile(options.footballPath, "utf8");
    const footballResult = parseFootballCsv(footballContent);

    if (footballResult.needsPositionSelection) {
      throw new Error("Football file must include or imply player positions.");
    }
    if (footballResult.errors.length > 0) {
      console.warn(`Football parse warnings:\n${footballResult.errors.join("\n")}`);
    }
    if (footballResult.warnings.length > 0) {
      console.warn(`Football parse warnings:\n${footballResult.warnings.join("\n")}`);
    }

    return {
      slug: options.slug,
      name: options.datasetName,
      season: options.season,
      sport: "football",
      datasetType: "historical-stats",
      projectionGroup: {
        id: `public-${options.slug}`,
        name: options.projectionGroupName,
        createdAt: new Date().toISOString(),
        batters: [],
        pitchers: [],
        twoWayPlayers: [],
        footballPlayers: footballResult.players,
        batterIdSource: null,
        pitcherIdSource: null,
      },
    };
  }

  if (!options.battersPath || !options.pitchersPath) {
    throw new Error("Baseball datasets require --batters and --pitchers.");
  }
  const [battersContent, pitchersContent] = await Promise.all([
    readFile(options.battersPath, "utf8"),
    readFile(options.pitchersPath, "utf8"),
  ]);

  const batterResult = parsePlayerCSV(battersContent, "batter");
  const pitcherResult = parsePlayerCSV(pitchersContent, "pitcher");

  if (batterResult.needsIdSelection || pitcherResult.needsIdSelection) {
    throw new Error("Both files must include MLBAMID or PlayerId columns.");
  }

  if (batterResult.errors.length > 0) {
    console.warn(`Batter parse warnings:\n${batterResult.errors.join("\n")}`);
  }
  if (pitcherResult.errors.length > 0) {
    console.warn(`Pitcher parse warnings:\n${pitcherResult.errors.join("\n")}`);
  }

  const { merged } = mergePlayers(batterResult.players, pitcherResult.players, "batter");

  return {
    slug: options.slug,
    name: options.datasetName,
    season: options.season,
    sport: "baseball",
    datasetType: "historical-stats",
    projectionGroup: {
      id: `public-${options.slug}`,
      name: options.projectionGroupName,
      createdAt: new Date().toISOString(),
      batters: batterResult.players,
      pitchers: pitcherResult.players,
      twoWayPlayers: merged as TwoWayPlayer[],
      batterIdSource: batterResult.idSource,
      pitcherIdSource: pitcherResult.idSource,
    },
  };
}

export async function upsertManifestEntry(
  entry: PublicDatasetManifestEntry,
  setDefault: boolean
): Promise<PublicDatasetManifest> {
  const manifest = await readManifest();
  const nextManifest = buildManifest(manifest, entry, setDefault);
  await writeFile(MANIFEST_PATH, `${JSON.stringify(nextManifest, null, 2)}\n`, "utf8");
  return nextManifest;
}

// The browser fetches datasets as plain static assets from /datasets/* —
// mirror everything written to data/public-datasets into public/datasets so
// anonymous traffic never needs a server handler (see PublicDatasetBootstrap).
const PUBLIC_DATASET_DIR = path.join(process.cwd(), "public", "datasets");

async function mirrorToPublic(fileName: string, content: string): Promise<string> {
  await mkdir(PUBLIC_DATASET_DIR, { recursive: true });
  const target = path.join(PUBLIC_DATASET_DIR, fileName);
  await writeFile(target, content, "utf8");
  return target;
}

async function main() {
  const options = parseGenerateOptions(process.argv.slice(2));
  const payload = await generatePublicDataset(options);

  const payloadContent = `${JSON.stringify(payload, null, 2)}\n`;
  await mkdir(path.dirname(options.outputPath), { recursive: true });
  await writeFile(options.outputPath, payloadContent, "utf8");
  await mirrorToPublic(`${payload.slug}.json`, payloadContent);

  const nextManifest = await upsertManifestEntry(
    {
      slug: payload.slug,
      name: payload.name,
      season: payload.season,
      sport: payload.sport,
      datasetType: payload.datasetType,
      default: options.setDefault,
    },
    options.setDefault
  );
  await mirrorToPublic("manifest.json", `${JSON.stringify(nextManifest, null, 2)}\n`);

  console.log(`Wrote ${options.outputPath}`);
  console.log(`Updated ${MANIFEST_PATH}`);
  console.log(`Mirrored to ${PUBLIC_DATASET_DIR}`);
}

const isMainModule =
  typeof process.argv[1] === "string" &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule) {
  void main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

export { parseGenerateOptions };
