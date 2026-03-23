import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvConfig } from "@next/env";
import {
  PUBLIC_DATASET_MANIFEST_KEY,
  parsePublicDatasetManifest,
  parsePublicDatasetPayload,
  type PublicDatasetManifest,
} from "@/lib/publicDatasets";
import { getPublicDatasetObjectKey, putPublicDatasetObject } from "@/server/publicDatasets/core";

const DATASET_DIR = path.join(process.cwd(), "data", "public-datasets");

loadEnvConfig(process.cwd());

export async function readJson(filePath: string): Promise<unknown> {
  return JSON.parse(await readFile(filePath, "utf8"));
}

export async function loadLocalManifest(): Promise<PublicDatasetManifest> {
  return parsePublicDatasetManifest(await readJson(path.join(DATASET_DIR, "manifest.json")));
}

export async function loadLocalDatasets() {
  const entries = await readdir(DATASET_DIR, { withFileTypes: true });
  const datasetFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json") && entry.name !== "manifest.json")
    .map((entry) => path.join(DATASET_DIR, entry.name));

  const payloads = await Promise.all(
    datasetFiles.map(async (filePath) => parsePublicDatasetPayload(await readJson(filePath)))
  );

  return payloads.sort((left, right) => left.slug.localeCompare(right.slug));
}

export function validateManifestAgainstDatasets(manifest: PublicDatasetManifest, datasetSlugs: string[]) {
  const manifestSlugs = [...manifest.datasets.map((dataset) => dataset.slug)].sort();
  const sortedDatasetSlugs = [...datasetSlugs].sort();

  if (manifestSlugs.length !== sortedDatasetSlugs.length) {
    throw new Error("Manifest and dataset file count do not match.");
  }

  for (let index = 0; index < manifestSlugs.length; index += 1) {
    if (manifestSlugs[index] !== sortedDatasetSlugs[index]) {
      throw new Error(`Manifest slug mismatch: expected ${sortedDatasetSlugs[index]}, received ${manifestSlugs[index]}.`);
    }
  }
}

export async function publishPublicDatasets() {
  const manifest = await loadLocalManifest();
  const payloads = await loadLocalDatasets();

  validateManifestAgainstDatasets(
    manifest,
    payloads.map((payload) => payload.slug)
  );

  for (const payload of payloads) {
    const manifestEntry = manifest.datasets.find((dataset) => dataset.slug === payload.slug);
    if (!manifestEntry) {
      throw new Error(`No manifest entry found for ${payload.slug}.`);
    }
    if (
      manifestEntry.name !== payload.name ||
      manifestEntry.season !== payload.season ||
      manifestEntry.datasetType !== payload.datasetType
    ) {
      throw new Error(`Manifest metadata does not match dataset payload for ${payload.slug}.`);
    }
  }

  for (const payload of payloads) {
    await putPublicDatasetObject(
      getPublicDatasetObjectKey(payload.slug),
      JSON.stringify(payload, null, 2)
    );
  }

  await putPublicDatasetObject(
    PUBLIC_DATASET_MANIFEST_KEY,
    JSON.stringify(manifest, null, 2)
  );

  console.log(
    `Published ${payloads.length} public dataset${payloads.length === 1 ? "" : "s"} and manifest.`
  );
}

const isMainModule =
  typeof process.argv[1] === "string" &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule) {
  void publishPublicDatasets().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
