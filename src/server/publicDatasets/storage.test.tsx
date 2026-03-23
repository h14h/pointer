// @vitest-environment node

import { afterEach, describe, expect, it } from "vitest";
import { getPublicDatasetBySlug, getPublicDatasetManifest, PublicDatasetStorageError } from "@/server/publicDatasets/storage";

describe("public dataset storage", () => {
  afterEach(() => {
    delete process.env.TIGRIS_ENDPOINT;
    delete process.env.TIGRIS_BUCKET;
    delete process.env.TIGRIS_ACCESS_KEY_ID;
    delete process.env.TIGRIS_SECRET_ACCESS_KEY;
    delete process.env.TIGRIS_REGION;
  });

  it("loads the checked-in manifest when Tigris is not configured", async () => {
    const manifest = await getPublicDatasetManifest();

    expect(manifest.datasets).toHaveLength(1);
    expect(manifest.datasets[0]?.slug).toBe("historical-2025");
  });

  it("loads the checked-in dataset by slug when Tigris is not configured", async () => {
    const payload = await getPublicDatasetBySlug("historical-2025");

    expect(payload.projectionGroup.batters.length).toBeGreaterThan(0);
    expect(payload.projectionGroup.pitchers.length).toBeGreaterThan(0);
  });

  it("throws a controlled error for a missing dataset", async () => {
    await expect(getPublicDatasetBySlug("missing-dataset")).rejects.toMatchObject<
      Partial<PublicDatasetStorageError>
    >({
      status: 404,
      code: "object_not_found",
    });
  });
});

