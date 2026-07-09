import { handleGetPublicDataset } from "@/server/publicDatasets/handlers";

// The app itself fetches /datasets/*.json static assets; this route remains
// for external consumers. force-static caches per-slug responses so repeated
// hits (bots included) don't re-trigger storage reads.
export const dynamic = "force-static";

// Response construction lives in the shared handler core so the TanStack
// Start server route (src/routes/api.public-datasets.$slug.ts) serves
// byte-identical responses. Contract: src/test/contracts/publicDatasets/.
export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  return handleGetPublicDataset(slug);
}
