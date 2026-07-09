import { createFileRoute } from "@tanstack/react-router";
import { handleGetPublicDataset } from "@/server/publicDatasets/handlers";

// TanStack Start server route for GET /api/public-datasets/$slug. Mirrors
// src/app/api/public-datasets/[slug]/route.ts (Next.js) byte-for-byte via the
// shared handler core; contract: src/test/contracts/publicDatasets/.
// See api.public-datasets.ts for the caching-posture note.
export const Route = createFileRoute("/api/public-datasets/$slug")({
  server: {
    handlers: {
      GET: ({ params }) => handleGetPublicDataset(params.slug),
    },
  },
});
