import { NextResponse } from "next/server";
import { getPublicDatasetManifest, PublicDatasetStorageError } from "@/server/publicDatasets/storage";

// The app itself fetches /datasets/*.json static assets; this route remains
// for external consumers. force-static caches the response so repeated hits
// (bots included) don't re-trigger storage reads.
export const dynamic = "force-static";

export async function GET() {
  try {
    return NextResponse.json(await getPublicDatasetManifest());
  } catch (error) {
    if (error instanceof PublicDatasetStorageError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    return NextResponse.json(
      { error: "Failed to load public datasets.", code: "unknown_public_dataset_error" },
      { status: 500 }
    );
  }
}

