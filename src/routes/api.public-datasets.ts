import { createFileRoute } from "@tanstack/react-router";
import { handleGetPublicDatasetManifest } from "@/server/publicDatasets/handlers";

// TanStack Start server route for GET /api/public-datasets. Mirrors
// src/app/api/public-datasets/route.ts (Next.js) byte-for-byte via the shared
// handler core; the contract fixtures in src/test/contracts/publicDatasets/
// lock status/headers/body. API-only route: no component, so document
// requests never render it and SPA mode is unaffected.
//
// Caching: the Next route uses force-static; on the Start side the
// equivalent CDN/browser posture is applied at the serving layer (see
// publicDatasetsCacheHeaders in vite.config.ts and
// src/lib/publicDatasetsCachePolicy.ts), never inside the handler — the
// contract fixtures lock the handler's headers to content-type only.
export const Route = createFileRoute("/api/public-datasets")({
  server: {
    handlers: {
      GET: () => handleGetPublicDatasetManifest(),
    },
  },
});
