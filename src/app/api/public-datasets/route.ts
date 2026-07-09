import { handleGetPublicDatasetManifest } from "@/server/publicDatasets/handlers";

// The app itself fetches /datasets/*.json static assets; this route remains
// for external consumers. force-static caches the response so repeated hits
// (bots included) don't re-trigger storage reads.
export const dynamic = "force-static";

// Response construction lives in the shared handler core so the TanStack
// Start server route (src/routes/api.public-datasets.ts) serves byte-identical
// responses. Contract: src/test/contracts/publicDatasets/.
export async function GET() {
  return handleGetPublicDatasetManifest();
}
