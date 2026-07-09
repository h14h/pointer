// Production request handler for the built TanStack Start app.
//
// `vite build` emits two halves and no server that glues them together:
//   - dist/client/  — static assets: hashed /assets/*, the /datasets/*.json
//     mirrors (from public/), and the prerendered SPA shell (_shell.html).
//   - dist/server/server.js — a fetch handler covering the server routes
//     (/api/public-datasets*) and SSR-of-the-shell for document requests.
//
// This module composes them (scripts/serve.ts wires it to Bun.serve):
//   1. Static files are served straight from dist/client.
//   2. Document requests (no file, no extension, not /api) get the
//      PRERENDERED shell — zero render work per request, matching the
//      free-tier rule that the league prep/draft experience is a static
//      asset.
//   3. Everything else (the API routes) is delegated to the built fetch
//      handler.
//
// Cache posture (the serving layer owns it — handlers emit content-type
// only; see src/lib/publicDatasetsCachePolicy.ts):
//   - /datasets/*           → DATASETS_STATIC_ASSET_CACHE_CONTROL
//   - /api/public-datasets* → PUBLIC_DATASETS_API_CACHE_CONTROL
//   - hashed /assets/*      → immutable
//   - the SPA shell         → no-cache (deploys must propagate)

import { promises as fs } from "node:fs";
import path from "node:path";
import { cacheControlForPath } from "@/lib/publicDatasetsCachePolicy";

/** Vite content-hashes everything under /assets, so it can cache forever. */
export const IMMUTABLE_ASSET_CACHE_CONTROL = "public, max-age=31536000, immutable";

/** The SPA shell must revalidate so new deploys reach returning browsers. */
export const SPA_SHELL_CACHE_CONTROL = "no-cache";

const CONTENT_TYPES: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

export type ProductionServerOptions = {
  /** Absolute path to dist/client. */
  clientDir: string;
  /** The built Start fetch handler (default export of dist/server/server.js). */
  ssrFetch: (request: Request) => Response | Promise<Response>;
};

function contentTypeFor(filePath: string): string {
  return CONTENT_TYPES[path.extname(filePath).toLowerCase()] ?? "application/octet-stream";
}

/** Cache-Control for a static file under dist/client (if any). */
function staticCacheControl(pathname: string): string | undefined {
  const policy = cacheControlForPath(pathname);
  if (policy) return policy;
  if (pathname.startsWith("/assets/")) return IMMUTABLE_ASSET_CACHE_CONTROL;
  return undefined;
}

/**
 * Resolve a URL pathname to a file inside clientDir. Returns undefined for
 * anything that is not an existing regular file, and for any path that would
 * escape clientDir (encoded traversal like /%2e%2e/ — plain /../ is already
 * normalized away by the URL parser).
 */
async function resolveClientFile(
  clientDir: string,
  pathname: string,
): Promise<string | undefined> {
  if (pathname === "/" || pathname.length === 0) return undefined;
  const resolved = path.normalize(path.join(clientDir, pathname));
  if (resolved !== clientDir && !resolved.startsWith(clientDir + path.sep)) {
    return undefined;
  }
  try {
    const stats = await fs.stat(resolved);
    return stats.isFile() ? resolved : undefined;
  } catch {
    return undefined;
  }
}

function isApiPath(pathname: string): boolean {
  return pathname === "/api" || pathname.startsWith("/api/");
}

/** Document-ish URL: no /api prefix and no file extension in the last segment. */
function wantsSpaShell(pathname: string): boolean {
  if (isApiPath(pathname)) return false;
  const lastSegment = pathname.split("/").filter(Boolean).at(-1) ?? "";
  return !lastSegment.includes(".");
}

/**
 * Build the composed fetch handler. Framework-free (node:fs + WHATWG
 * fetch types) so it runs identically under Bun in production and under
 * vitest's node environment in src/server/productionServer.test.tsx.
 */
export function createProductionRequestHandler({
  clientDir,
  ssrFetch,
}: ProductionServerOptions): (request: Request) => Promise<Response> {
  const normalizedClientDir = path.resolve(clientDir);
  let shellPromise: Promise<Buffer> | undefined;

  function loadShell(): Promise<Buffer> {
    shellPromise ??= fs.readFile(path.join(normalizedClientDir, "_shell.html"));
    return shellPromise;
  }

  async function fileResponse(request: Request, filePath: string, pathname: string) {
    const headers = new Headers({ "content-type": contentTypeFor(filePath) });
    const cacheControl = staticCacheControl(pathname);
    if (cacheControl) headers.set("cache-control", cacheControl);
    const body = request.method === "HEAD" ? null : ((await fs.readFile(filePath)) as unknown as BodyInit);
    return new Response(body, { status: 200, headers });
  }

  return async function handleRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);
    let pathname: string;
    try {
      pathname = decodeURIComponent(url.pathname);
    } catch {
      return new Response("Bad Request", { status: 400 });
    }

    if (request.method === "GET" || request.method === "HEAD") {
      const filePath = await resolveClientFile(normalizedClientDir, pathname);
      if (filePath) {
        return fileResponse(request, filePath, pathname);
      }
      // A path that tried to escape clientDir is never a document URL.
      const escapesClientDir = !path
        .normalize(path.join(normalizedClientDir, pathname))
        .startsWith(normalizedClientDir);
      if (escapesClientDir) {
        return new Response("Not Found", { status: 404 });
      }
      if (wantsSpaShell(pathname)) {
        const shell = await loadShell();
        return new Response(request.method === "HEAD" ? null : (shell as unknown as BodyInit), {
          status: 200,
          headers: {
            "content-type": "text/html; charset=utf-8",
            "cache-control": SPA_SHELL_CACHE_CONTROL,
          },
        });
      }
      if (!isApiPath(pathname)) {
        // Asset-looking miss (has an extension, no file): plain 404 instead
        // of an SSR pass that would stream shell HTML at a .js request.
        return new Response("Not Found", { status: 404 });
      }
    }

    const response = await ssrFetch(request);
    const cacheControl = cacheControlForPath(pathname);
    if (cacheControl && !response.headers.has("cache-control")) {
      response.headers.set("cache-control", cacheControl);
    }
    return response;
  };
}
