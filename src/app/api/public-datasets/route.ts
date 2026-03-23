import { NextResponse } from "next/server";
import { getPublicDatasetManifest, PublicDatasetStorageError } from "@/server/publicDatasets/storage";

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

