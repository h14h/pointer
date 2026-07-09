// @vitest-environment node

// The production serving layer (scripts/serve.ts → createProductionRequestHandler)
// is where the locked cache policies actually reach clients in the deployed
// topology — the API handlers themselves emit content-type only (see
// src/lib/publicDatasetsCachePolicy.ts and the start-contract test). These
// tests pin that composition against a fixture dist/client.

import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DATASETS_STATIC_ASSET_CACHE_CONTROL,
  PUBLIC_DATASETS_API_CACHE_CONTROL,
} from "@/lib/publicDatasetsCachePolicy";
import {
  createProductionRequestHandler,
  IMMUTABLE_ASSET_CACHE_CONTROL,
  SPA_SHELL_CACHE_CONTROL,
} from "@/server/productionServer";

const SHELL_HTML = "<!DOCTYPE html><html><body>spa shell</body></html>";
const MANIFEST_JSON = `{"datasets":[]}`;
const HASHED_JS = "console.log('hashed');";

const tmpRoot = mkdtempSync(path.join(os.tmpdir(), "draftspa-dist-"));
const clientDir = path.join(tmpRoot, "client");
mkdirSync(clientDir);
writeFileSync(path.join(clientDir, "_shell.html"), SHELL_HTML);
mkdirSync(path.join(clientDir, "assets"));
writeFileSync(path.join(clientDir, "assets", "app-C0FFEE42.js"), HASHED_JS);
mkdirSync(path.join(clientDir, "datasets"));
writeFileSync(path.join(clientDir, "datasets", "manifest.json"), MANIFEST_JSON);
// Exists on disk, sits OUTSIDE dist/client — must never be reachable.
writeFileSync(path.join(tmpRoot, "outside-secret.txt"), "must never be served");

afterAll(() => {
  rmSync(tmpRoot, { recursive: true, force: true });
});

const ssrFetch = vi.fn(async () => {
  // Mirrors the contract-locked handler responses: content-type only.
  return new Response(`{"from":"ssr"}`, {
    status: 200,
    headers: { "content-type": "application/json" },
  });
});

const handle = createProductionRequestHandler({ clientDir, ssrFetch });

function get(pathname: string): Promise<Response> {
  return handle(new Request(`http://localhost${pathname}`));
}

describe("production serving layer", () => {
  beforeEach(() => {
    ssrFetch.mockClear();
  });

  it("serves /datasets/* statics with the locked Cache-Control", async () => {
    const response = await get("/datasets/manifest.json");
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe(
      DATASETS_STATIC_ASSET_CACHE_CONTROL,
    );
    expect(response.headers.get("content-type")).toBe("application/json");
    await expect(response.text()).resolves.toBe(MANIFEST_JSON);
    expect(ssrFetch).not.toHaveBeenCalled();
  });

  it("delegates /api/public-datasets* to the Start handler and adds the API Cache-Control", async () => {
    const response = await get("/api/public-datasets/historical-2025");
    expect(ssrFetch).toHaveBeenCalledOnce();
    expect(response.status).toBe(200);
    // The handler's own headers/body stay untouched (byte-locked contract)…
    expect(response.headers.get("content-type")).toBe("application/json");
    await expect(response.text()).resolves.toBe(`{"from":"ssr"}`);
    // …the serving layer adds only the cache posture.
    expect(response.headers.get("cache-control")).toBe(
      PUBLIC_DATASETS_API_CACHE_CONTROL,
    );
  });

  it("serves hashed /assets/* as immutable", async () => {
    const response = await get("/assets/app-C0FFEE42.js");
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe(IMMUTABLE_ASSET_CACHE_CONTROL);
    await expect(response.text()).resolves.toBe(HASHED_JS);
  });

  it("serves the prerendered SPA shell for document URLs without touching the SSR handler", async () => {
    for (const pathname of ["/", "/pricing", "/league/abc123/board", "/league/abc123/nonsense/extra"]) {
      const response = await get(pathname);
      expect(response.status, pathname).toBe(200);
      expect(response.headers.get("content-type"), pathname).toBe("text/html; charset=utf-8");
      expect(response.headers.get("cache-control"), pathname).toBe(SPA_SHELL_CACHE_CONTROL);
      await expect(response.text(), pathname).resolves.toBe(SHELL_HTML);
    }
    expect(ssrFetch).not.toHaveBeenCalled();
  });

  it("rejects encoded path traversal and asset-looking misses with 404", async () => {
    // /../ in a raw URL is normalized away by the URL parser, so attackers
    // encode it; the resolver must refuse anything escaping dist/client even
    // when the target file exists.
    const traversal = await get("/%2e%2e/outside-secret.txt");
    expect(traversal.status).toBe(404);
    await expect(traversal.text()).resolves.not.toContain("must never be served");
    const missingAsset = await get("/assets/nope-12345678.js");
    expect(missingAsset.status).toBe(404);
    expect(ssrFetch).not.toHaveBeenCalled();
  });
});
