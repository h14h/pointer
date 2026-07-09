// Server-side only: reads dataset payloads from Tigris/S3 or the local
// fallback (data/public-datasets). Import from server routes/scripts only —
// never from client components (client bundles that pulled this in would
// drag in @aws-sdk).
export * from "@/server/publicDatasets/core";
