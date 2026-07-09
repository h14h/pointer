// @vitest-environment node

// Next.js adapter for the public-datasets API contract. The expected
// statuses/headers/bodies live as plain fixtures in
// src/test/contracts/publicDatasets/ — in the TanStack Start migration
// (Phase 4), add a sibling adapter test there that invokes the ported server
// routes and asserts against the SAME fixtures via the same helpers; the
// ported responses must be byte-equivalent.
//
// Unlike public-datasets-route.test.tsx, this file does NOT mock the storage
// layer: it exercises the deterministic local fallback (data/public-datasets)
// so recorded fixtures match production data exactly. TIGRIS_* env vars are
// cleared so the run can never touch live S3.

import { beforeAll, describe, expect, it } from "vitest";
import {
  assertContractResponse,
  captureResponse,
  DATASETS_STATIC_ASSET_CACHE_POLICY,
} from "@/test/contracts/publicDatasets/contract";
import nextConfig from "../../../../next.config";

const TIGRIS_ENV_VARS = [
  "TIGRIS_ENDPOINT",
  "TIGRIS_BUCKET",
  "TIGRIS_ACCESS_KEY_ID",
  "TIGRIS_SECRET_ACCESS_KEY",
  "TIGRIS_REGION",
] as const;

async function getSlugResponse(slug: string): Promise<Response> {
  const { GET } = await import("@/app/api/public-datasets/[slug]/route");
  return GET(new Request(`http://localhost/api/public-datasets/${slug}`), {
    params: Promise.resolve({ slug }),
  });
}

describe("public dataset API contract", () => {
  beforeAll(() => {
    // Force the local-fallback storage path so snapshots are deterministic.
    for (const name of TIGRIS_ENV_VARS) {
      delete process.env[name];
    }
  });

  it("GET /api/public-datasets matches the recorded manifest contract", async () => {
    const route = await import("@/app/api/public-datasets/route");
    assertContractResponse("manifest", await captureResponse(await route.GET()));
    // Route segment config external consumers depend on (response caching).
    expect(route.dynamic).toBe("force-static");
  });

  it("GET /api/public-datasets/historical-2025 matches the recorded contract", async () => {
    assertContractResponse(
      "dataset-historical-2025",
      await captureResponse(await getSlugResponse("historical-2025"))
    );
  });

  it("GET /api/public-datasets/football-historical-2025 matches the recorded contract", async () => {
    assertContractResponse(
      "dataset-football-historical-2025",
      await captureResponse(await getSlugResponse("football-historical-2025"))
    );
  });

  it("GET /api/public-datasets/<unknown> matches the recorded 404 contract", async () => {
    const route = await import("@/app/api/public-datasets/[slug]/route");
    expect(route.dynamic).toBe("force-static");
    assertContractResponse(
      "dataset-not-found",
      await captureResponse(await getSlugResponse("missing-dataset"))
    );
  });

  it("next.config.ts applies the locked cache policy to /datasets/:path*", async () => {
    const rules = await nextConfig.headers?.();
    const rule = rules?.find(
      (candidate) => candidate.source === DATASETS_STATIC_ASSET_CACHE_POLICY.source
    );

    expect(rule).toBeDefined();
    expect(rule?.headers).toEqual(DATASETS_STATIC_ASSET_CACHE_POLICY.headers);
  });
});
