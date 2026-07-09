// Cache posture for the public-datasets surface, shared between the serving
// layers so Next.js and TanStack Start emit matching headers.
//
// Ground truth (observed on the pre-migration production Next.js server,
// and preserved byte-for-byte across the TanStack Start cutover):
// - /api/public-datasets and /api/public-datasets/[slug] (force-static):
//   `cache-control: s-maxage=31536000` on every response, including the 404
//   error shape (Next caches the prerendered/on-demand static output and
//   lets shared caches keep it indefinitely; browsers always revalidate).
// - /datasets/*.json static mirrors (next.config.ts headers()):
//   `cache-control: public, max-age=86400, stale-while-revalidate=604800`.
//
// These headers are applied at the SERVING layer: the vite dev/preview
// middleware (vite.config.ts) and the production server
// (src/server/productionServer.ts) both resolve them through
// cacheControlForPath below. They are deliberately NOT set inside the API
// handlers: the contract fixtures in src/test/contracts/publicDatasets/ lock
// handler headers to content-type only.
//
// DATASETS_STATIC_ASSET_CACHE_CONTROL must stay equal to
// DATASETS_STATIC_ASSET_CACHE_POLICY in the contract module — asserted by
// src/test/contracts/publicDatasets/start-contract.test.tsx.

/** Cache-Control for the mirrored /datasets/* static JSON assets. */
export const DATASETS_STATIC_ASSET_CACHE_CONTROL =
  "public, max-age=86400, stale-while-revalidate=604800";

/** URL prefix of the mirrored static dataset assets. */
export const DATASETS_STATIC_ASSET_PATH_PREFIX = "/datasets/";

/**
 * Cache-Control for the /api/public-datasets routes, matching what Next's
 * force-static output serves in production (shared caches may hold the
 * response; browsers revalidate every time).
 */
export const PUBLIC_DATASETS_API_CACHE_CONTROL = "s-maxage=31536000";

/** URL prefix of the public-datasets API routes. */
export const PUBLIC_DATASETS_API_PATH = "/api/public-datasets";

/** Cache-Control value (if any) the serving layer should apply to a path. */
export function cacheControlForPath(pathname: string): string | undefined {
  if (pathname.startsWith(DATASETS_STATIC_ASSET_PATH_PREFIX)) {
    return DATASETS_STATIC_ASSET_CACHE_CONTROL;
  }
  if (
    pathname === PUBLIC_DATASETS_API_PATH ||
    pathname.startsWith(`${PUBLIC_DATASETS_API_PATH}/`)
  ) {
    return PUBLIC_DATASETS_API_CACHE_CONTROL;
  }
  return undefined;
}
