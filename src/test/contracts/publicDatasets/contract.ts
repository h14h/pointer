// API contract fixtures + assertions for the public-datasets endpoints.
//
// PURPOSE: these endpoints have external consumers. This module locks their
// exact behavior (status, headers, byte-exact JSON bodies) ahead of the
// migration to TanStack Start. The fixtures under ./fixtures/ are plain data
// (one `<name>.head.json` with { status, headers } and one `<name>.body.json`
// with the exact response body bytes) and the assertion helpers below take
// only (status, headers, body) — no Next.js types. In migration Phase 4,
// write a new thin adapter test that invokes the TanStack Start server routes
// and feeds their responses into these same helpers; the ported routes must
// produce byte-equivalent responses against these unchanged fixtures.
//
// Determinism: fixtures are recorded from the local fallback storage path
// (data/public-datasets/*.json), never live S3/Tigris. The adapter test must
// clear TIGRIS_* env vars before invoking the handlers.
//
// To (re)record fixtures intentionally, run the contract test with
// RECORD_PUBLIC_DATASET_CONTRACT=1. Never let CI record.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export type CapturedResponse = {
  status: number;
  /** Lower-cased header names -> values. */
  headers: Record<string, string>;
  /** Exact body text (byte-equivalence is asserted on this string). */
  body: string;
};

/** Contract cases, keyed by fixture name. */
export const PUBLIC_DATASET_CONTRACT_CASES = {
  /** GET /api/public-datasets */
  manifest: { requestPath: "/api/public-datasets" },
  /** GET /api/public-datasets/historical-2025 (default baseball dataset) */
  "dataset-historical-2025": {
    requestPath: "/api/public-datasets/historical-2025",
    slug: "historical-2025",
  },
  /** GET /api/public-datasets/football-historical-2025 */
  "dataset-football-historical-2025": {
    requestPath: "/api/public-datasets/football-historical-2025",
    slug: "football-historical-2025",
  },
  /** GET /api/public-datasets/<unknown slug> — 404 error shape. */
  "dataset-not-found": {
    requestPath: "/api/public-datasets/missing-dataset",
    slug: "missing-dataset",
  },
} as const;

export type PublicDatasetContractName = keyof typeof PUBLIC_DATASET_CONTRACT_CASES;

/**
 * The cache policy next.config.ts applies to the mirrored static dataset
 * assets (/datasets/*.json). The TanStack Start port must serve these assets
 * with the same Cache-Control header, whatever mechanism it uses.
 */
export const DATASETS_STATIC_ASSET_CACHE_POLICY = {
  source: "/datasets/:path*",
  headers: [
    {
      key: "Cache-Control",
      value: "public, max-age=86400, stale-while-revalidate=604800",
    },
  ],
} as const;

const FIXTURES_DIR = path.join(
  process.cwd(),
  "src/test/contracts/publicDatasets/fixtures"
);

const RECORD = process.env.RECORD_PUBLIC_DATASET_CONTRACT === "1";

function fixturePaths(name: PublicDatasetContractName) {
  return {
    head: path.join(FIXTURES_DIR, `${name}.head.json`),
    body: path.join(FIXTURES_DIR, `${name}.body.json`),
  };
}

/** Framework-agnostic adapter: capture a fetch-API Response for assertion. */
export async function captureResponse(response: Response): Promise<CapturedResponse> {
  const headers: Record<string, string> = {};
  for (const [key, value] of response.headers.entries()) {
    headers[key.toLowerCase()] = value;
  }
  return { status: response.status, headers, body: await response.text() };
}

function describeBodyMismatch(expected: string, actual: string): string {
  let index = 0;
  const max = Math.min(expected.length, actual.length);
  while (index < max && expected[index] === actual[index]) index += 1;
  const from = Math.max(0, index - 80);
  const to = index + 80;
  return [
    `body mismatch at char ${index} (expected length ${expected.length}, actual length ${actual.length})`,
    `expected …${JSON.stringify(expected.slice(from, to))}…`,
    `actual   …${JSON.stringify(actual.slice(from, to))}…`,
  ].join("\n");
}

/**
 * Assert (or, with RECORD_PUBLIC_DATASET_CONTRACT=1, record) that a captured
 * response matches the stored contract fixture byte-for-byte. Throws a plain
 * Error on mismatch so it works under any test runner.
 */
export function assertContractResponse(
  name: PublicDatasetContractName,
  actual: CapturedResponse
): void {
  const { head, body } = fixturePaths(name);

  if (RECORD) {
    mkdirSync(FIXTURES_DIR, { recursive: true });
    writeFileSync(
      head,
      `${JSON.stringify({ status: actual.status, headers: actual.headers }, null, 2)}\n`,
      "utf8"
    );
    writeFileSync(body, actual.body, "utf8");
    return;
  }

  let expectedHead: { status: number; headers: Record<string, string> };
  let expectedBody: string;
  try {
    expectedHead = JSON.parse(readFileSync(head, "utf8"));
    expectedBody = readFileSync(body, "utf8");
  } catch (error) {
    throw new Error(
      `Missing contract fixture for "${name}". Record it with RECORD_PUBLIC_DATASET_CONTRACT=1.`,
      { cause: error }
    );
  }

  const problems: string[] = [];
  if (actual.status !== expectedHead.status) {
    problems.push(`status: expected ${expectedHead.status}, got ${actual.status}`);
  }
  const expectedHeaderJson = JSON.stringify(sortKeys(expectedHead.headers));
  const actualHeaderJson = JSON.stringify(sortKeys(actual.headers));
  if (expectedHeaderJson !== actualHeaderJson) {
    problems.push(`headers: expected ${expectedHeaderJson}, got ${actualHeaderJson}`);
  }
  if (actual.body !== expectedBody) {
    problems.push(describeBodyMismatch(expectedBody, actual.body));
  }

  if (problems.length > 0) {
    throw new Error(
      `public-datasets contract violated for "${name}":\n${problems.join("\n")}`
    );
  }
}

function sortKeys(record: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(record).sort(([a], [b]) => a.localeCompare(b))
  );
}
