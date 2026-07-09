// @vitest-environment node

// TanStack Start adapter for the public-datasets API contract — the Phase 4
// sibling of src/app/api/public-datasets/public-datasets-contract.test.tsx.
// It invokes the Start server-route handlers directly (no HTTP server) and
// feeds their responses through the SAME assertion helpers against the SAME
// unmodified fixtures, so the ported routes must stay byte-equivalent to the
// Next.js ones.
//
// Like the Next adapter, this exercises the deterministic local-fallback
// storage (data/public-datasets); TIGRIS_* env vars are cleared so the run
// can never touch live S3.

import type { AnyRoute } from "@tanstack/react-router";
import { beforeAll, describe, expect, it } from "vitest";
import {
  cacheControlForPath,
  DATASETS_STATIC_ASSET_CACHE_CONTROL,
} from "@/lib/publicDatasetsCachePolicy";
import { Route as slugRoute } from "@/routes/api.public-datasets.$slug";
import { Route as manifestRoute } from "@/routes/api.public-datasets";
import {
  assertContractResponse,
  captureResponse,
  DATASETS_STATIC_ASSET_CACHE_POLICY,
  PUBLIC_DATASET_CONTRACT_CASES,
  type PublicDatasetContractName,
} from "@/test/contracts/publicDatasets/contract";

const TIGRIS_ENV_VARS = [
  "TIGRIS_ENDPOINT",
  "TIGRIS_BUCKET",
  "TIGRIS_ACCESS_KEY_ID",
  "TIGRIS_SECRET_ACCESS_KEY",
  "TIGRIS_REGION",
] as const;

/**
 * Invoke a Start server-route GET handler the way the Start request pipeline
 * does (@tanstack/start-server-core handleServerRoutes: handler receives
 * { request, params, pathname, context, next } and returns a Response).
 */
async function invokeGet(
  route: AnyRoute,
  requestPath: string,
  params: Record<string, string>
): Promise<Response> {
  const handlers = route.options.server?.handlers;
  expect(handlers, `route ${route.path} declares server handlers`).toBeDefined();
  const get = (handlers as Record<string, unknown>).GET;
  expect(typeof get, `route ${route.path} declares a GET handler`).toBe("function");

  const result = await (get as (ctx: unknown) => Promise<unknown>)({
    request: new Request(`http://localhost${requestPath}`),
    params,
    pathname: requestPath,
    context: undefined,
    next: () => {
      throw new Error("public-datasets handlers must respond, not delegate");
    },
  });

  expect(result).toBeInstanceOf(Response);
  return result as Response;
}

async function assertCase(name: PublicDatasetContractName, response: Response) {
  assertContractResponse(name, await captureResponse(response));
}

function slugCase(name: Extract<PublicDatasetContractName, `dataset-${string}`>) {
  const contractCase = PUBLIC_DATASET_CONTRACT_CASES[name];
  return invokeGet(slugRoute, contractCase.requestPath, { slug: contractCase.slug });
}

describe("public dataset API contract (TanStack Start server routes)", () => {
  beforeAll(() => {
    // Force the local-fallback storage path so snapshots are deterministic.
    for (const name of TIGRIS_ENV_VARS) {
      delete process.env[name];
    }
  });

  it("GET /api/public-datasets matches the recorded manifest contract", async () => {
    await assertCase(
      "manifest",
      await invokeGet(
        manifestRoute,
        PUBLIC_DATASET_CONTRACT_CASES.manifest.requestPath,
        {}
      )
    );
  });

  it("GET /api/public-datasets/historical-2025 matches the recorded contract", async () => {
    await assertCase("dataset-historical-2025", await slugCase("dataset-historical-2025"));
  });

  it("GET /api/public-datasets/football-historical-2025 matches the recorded contract", async () => {
    await assertCase(
      "dataset-football-historical-2025",
      await slugCase("dataset-football-historical-2025")
    );
  });

  it("GET /api/public-datasets/<unknown> matches the recorded 404 contract", async () => {
    await assertCase("dataset-not-found", await slugCase("dataset-not-found"));
  });

  it("the Start serving layer applies the locked /datasets cache policy", () => {
    // The vite dev/preview middleware (vite.config.ts) resolves headers via
    // cacheControlForPath; it must serve /datasets/* with the exact policy
    // next.config.ts locked (DATASETS_STATIC_ASSET_CACHE_POLICY covers
    // "/datasets/:path*").
    const lockedValue = DATASETS_STATIC_ASSET_CACHE_POLICY.headers[0].value;
    expect(DATASETS_STATIC_ASSET_CACHE_POLICY.headers).toHaveLength(1);
    expect(DATASETS_STATIC_ASSET_CACHE_POLICY.headers[0].key).toBe("Cache-Control");
    expect(DATASETS_STATIC_ASSET_CACHE_CONTROL).toBe(lockedValue);
    expect(cacheControlForPath("/datasets/manifest.json")).toBe(lockedValue);
    expect(cacheControlForPath("/datasets/nested/asset.json")).toBe(lockedValue);
    // Non-dataset paths must not inherit the static-asset policy.
    expect(cacheControlForPath("/leaderboard-visual")).toBeUndefined();
  });
});
