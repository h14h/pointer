// Framework-agnostic HTTP handlers for the public-datasets API.
//
// Both the Next.js route files (src/app/api/public-datasets/**/route.ts) and
// the TanStack Start server routes (src/routes/api.public-datasets*.ts) call
// these, so the two frameworks serve byte-identical responses by
// construction. The contract fixtures in src/test/contracts/publicDatasets/
// are the arbiter: bodies are the compact JSON.stringify of the zod-parsed
// payloads, and the only header is content-type (any caching headers are
// applied at the serving layer, never here — see vite.config.ts and
// next.config.ts).
import {
  getPublicDatasetBySlug,
  getPublicDatasetManifest,
  PublicDatasetStorageError,
} from "@/server/publicDatasets/storage";

/**
 * Compact JSON response matching NextResponse.json() byte-for-byte:
 * JSON.stringify body, content-type "application/json" (no charset).
 */
function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function storageErrorResponse(error: unknown, fallbackMessage: string): Response {
  if (error instanceof PublicDatasetStorageError) {
    return jsonResponse({ error: error.message, code: error.code }, error.status);
  }
  return jsonResponse({ error: fallbackMessage, code: "unknown_public_dataset_error" }, 500);
}

/** GET /api/public-datasets */
export async function handleGetPublicDatasetManifest(): Promise<Response> {
  try {
    return jsonResponse(await getPublicDatasetManifest());
  } catch (error) {
    return storageErrorResponse(error, "Failed to load public datasets.");
  }
}

/** GET /api/public-datasets/[slug] */
export async function handleGetPublicDataset(slug: string): Promise<Response> {
  try {
    return jsonResponse(await getPublicDatasetBySlug(slug));
  } catch (error) {
    return storageErrorResponse(error, `Failed to load public dataset ${slug}.`);
  }
}
