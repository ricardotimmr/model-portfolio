import {
  BlobNotFoundError,
  del,
  head,
  list,
  put,
  type HeadBlobResult,
  type ListBlobResultBlob,
  type PutBlobResult,
} from '@vercel/blob';
import { MAX_IMAGE_FILE_SIZE, type ImageMetadata } from './image-core';

const PUBLIC_CACHE_SECONDS = 60 * 60 * 24 * 30;

function getBlobAuthOptions() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  // The SDK otherwise prefers VERCEL_OIDC_TOKEN. A pulled Preview environment
  // can contain a Development OIDC token that is intentionally not authorized
  // for the store, while its read/write token is valid for local migrations.
  return token ? { token } : {};
}

export function assertBlobConfigured() {
  const hasReadWriteToken = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
  const hasOidcCredentials = Boolean(
    process.env.VERCEL_OIDC_TOKEN && process.env.BLOB_STORE_ID,
  );

  if (!hasReadWriteToken && !hasOidcCredentials) {
    throw new Error(
      'Vercel Blob is not configured. Connect a Blob store and pull BLOB_READ_WRITE_TOKEN into .env.local.',
    );
  }
}

export async function uploadPublicImage({
  pathname,
  buffer,
  metadata,
}: {
  pathname: string;
  buffer: Buffer;
  metadata: ImageMetadata;
}): Promise<PutBlobResult> {
  assertBlobConfigured();

  return put(pathname, buffer, {
    ...getBlobAuthOptions(),
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: false,
    cacheControlMaxAge: PUBLIC_CACHE_SECONDS,
    contentType: metadata.contentType,
    maximumSizeInBytes: MAX_IMAGE_FILE_SIZE,
    multipart: buffer.length > 4 * 1024 * 1024,
  });
}

export async function getBlobMetadata(
  urlOrPathname: string,
): Promise<HeadBlobResult | null> {
  assertBlobConfigured();

  try {
    return await head(urlOrPathname, getBlobAuthOptions());
  } catch (error) {
    if (error instanceof BlobNotFoundError) return null;
    throw error;
  }
}

export async function listBlobAssets(
  prefix: string,
): Promise<ListBlobResultBlob[]> {
  assertBlobConfigured();

  const assets: ListBlobResultBlob[] = [];
  let cursor: string | undefined;

  do {
    const page = await list({
      ...getBlobAuthOptions(),
      prefix,
      cursor,
      limit: 1000,
    });
    assets.push(...page.blobs);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);

  return assets;
}

export async function deleteBlobAsset(url: string, etag?: string) {
  assertBlobConfigured();
  await del(url, {
    ...getBlobAuthOptions(),
    ...(etag ? { ifMatch: etag } : {}),
  });
}
