import { NextResponse } from "next/server";
import { getPublicDatasetBySlug, PublicDatasetStorageError } from "@/server/publicDatasets/storage";

// The app itself fetches /datasets/*.json static assets; this route remains
// for external consumers. force-static caches per-slug responses so repeated
// hits (bots included) don't re-trigger storage reads.
export const dynamic = "force-static";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;

  try {
    return NextResponse.json(await getPublicDatasetBySlug(slug));
  } catch (error) {
    if (error instanceof PublicDatasetStorageError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    return NextResponse.json(
      { error: `Failed to load public dataset ${slug}.`, code: "unknown_public_dataset_error" },
      { status: 500 }
    );
  }
}

