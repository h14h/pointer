import { readFile } from "node:fs/promises";
import path from "node:path";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import {
  DEFAULT_PUBLIC_DATASET_SLUG,
  PUBLIC_DATASET_MANIFEST_KEY,
  parsePublicDatasetManifest,
  parsePublicDatasetPayload,
  type PublicDatasetManifest,
  type PublicDatasetPayload,
} from "@/lib/publicDatasets";

type TigrisConfig = {
  endpoint: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
};

export class PublicDatasetStorageError extends Error {
  status: number;
  code: string;

  constructor(message: string, options?: { status?: number; code?: string; cause?: unknown }) {
    super(message, options?.cause ? { cause: options.cause } : undefined);
    this.name = "PublicDatasetStorageError";
    this.status = options?.status ?? 500;
    this.code = options?.code ?? "public_dataset_storage_error";
  }
}

function getTigrisConfig(): TigrisConfig | null {
  const endpoint = process.env.TIGRIS_ENDPOINT;
  const bucket = process.env.TIGRIS_BUCKET;
  const accessKeyId = process.env.TIGRIS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.TIGRIS_SECRET_ACCESS_KEY;
  const region = process.env.TIGRIS_REGION;

  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey || !region) {
    return null;
  }

  return {
    endpoint,
    bucket,
    accessKeyId,
    secretAccessKey,
    region,
  };
}

function createTigrisClient(config: TigrisConfig): S3Client {
  return new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    forcePathStyle: true,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

function getLocalDatasetPath(key: string): string {
  return path.join(process.cwd(), "data", key);
}

async function readLocalJson(key: string): Promise<unknown> {
  const file = await readFile(getLocalDatasetPath(key), "utf8");
  return JSON.parse(file);
}

async function readObjectJson(key: string): Promise<unknown> {
  const config = getTigrisConfig();

  if (!config) {
    try {
      return await readLocalJson(key);
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new PublicDatasetStorageError(`Public dataset object is not valid JSON: ${key}`, {
          status: 502,
          code: "invalid_json",
          cause: error,
        });
      }
      const message = error instanceof Error ? error.message.toLowerCase() : "";
      if (message.includes("enoent") || message.includes("not found")) {
        throw new PublicDatasetStorageError(`Public dataset object not found: ${key}`, {
          status: 404,
          code: "object_not_found",
          cause: error,
        });
      }
      throw new PublicDatasetStorageError(`Failed to read local public dataset object: ${key}`, {
        status: 500,
        code: "local_object_read_failed",
        cause: error,
      });
    }
  }

  const client = createTigrisClient(config);

  try {
    const response = await client.send(
      new GetObjectCommand({
        Bucket: config.bucket,
        Key: key,
      })
    );

    if (!response.Body) {
      throw new PublicDatasetStorageError(`Object ${key} returned an empty body.`, {
        status: 502,
        code: "empty_object_body",
      });
    }

    const body = await response.Body.transformToString();
    return JSON.parse(body);
  } catch (error) {
    if (error instanceof PublicDatasetStorageError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : "Unknown storage error";
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes("no such key") || lowerMessage.includes("not found")) {
      throw new PublicDatasetStorageError(`Public dataset object not found: ${key}`, {
        status: 404,
        code: "object_not_found",
        cause: error,
      });
    }
    if (error instanceof SyntaxError) {
      throw new PublicDatasetStorageError(`Public dataset object is not valid JSON: ${key}`, {
        status: 502,
        code: "invalid_json",
        cause: error,
      });
    }
    throw new PublicDatasetStorageError(`Failed to read public dataset object: ${key}`, {
      status: 502,
      code: "object_read_failed",
      cause: error,
    });
  }
}

export function getPublicDatasetObjectKey(slug: string): string {
  return `public-datasets/${slug}.json`;
}

export async function getPublicDatasetManifest(): Promise<PublicDatasetManifest> {
  try {
    return parsePublicDatasetManifest(await readObjectJson(PUBLIC_DATASET_MANIFEST_KEY));
  } catch (error) {
    if (error instanceof PublicDatasetStorageError) throw error;
    throw new PublicDatasetStorageError("Failed to load the public dataset manifest.", {
      status: 502,
      code: "manifest_invalid",
      cause: error,
    });
  }
}

export async function getPublicDatasetBySlug(slug: string): Promise<PublicDatasetPayload> {
  try {
    const payload = parsePublicDatasetPayload(await readObjectJson(getPublicDatasetObjectKey(slug)));
    if (payload.slug !== slug) {
      throw new PublicDatasetStorageError(
        `Public dataset slug mismatch for ${slug}: received ${payload.slug}.`,
        {
          status: 502,
          code: "dataset_slug_mismatch",
        }
      );
    }
    return payload;
  } catch (error) {
    if (error instanceof PublicDatasetStorageError) throw error;
    throw new PublicDatasetStorageError(`Failed to load public dataset ${slug}.`, {
      status: 502,
      code: "dataset_invalid",
      cause: error,
    });
  }
}

export async function getDefaultPublicDataset(): Promise<PublicDatasetPayload> {
  const manifest = await getPublicDatasetManifest();
  const defaultDataset =
    manifest.datasets.find((dataset) => dataset.default) ??
    manifest.datasets.find((dataset) => dataset.slug === DEFAULT_PUBLIC_DATASET_SLUG) ??
    manifest.datasets[0];

  if (!defaultDataset) {
    throw new PublicDatasetStorageError("The public dataset catalog is empty.", {
      status: 404,
      code: "empty_catalog",
    });
  }

  return getPublicDatasetBySlug(defaultDataset.slug);
}

export async function putPublicDatasetObject(
  key: string,
  body: string,
  contentType = "application/json"
) {
  const config = getTigrisConfig();

  if (!config) {
    throw new PublicDatasetStorageError(
      "Tigris credentials are required to publish public datasets.",
      {
        status: 500,
        code: "missing_tigris_config",
      }
    );
  }

  const client = createTigrisClient(config);
  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
}

