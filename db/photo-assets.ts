import 'server-only';

import { neon } from '@neondatabase/serverless';
import { and, eq } from 'drizzle-orm';
import { revalidateTag } from 'next/cache';
import { deleteBlobAsset, getBlobMetadata } from '@/lib/blob';
import { inspectImageBuffer, MAX_IMAGE_FILE_SIZE } from '@/lib/images';
import { assertPhotoDeletionAllowed } from '@/lib/photo-asset-core';
import { db } from './index';
import { photos, shootings } from './schema';

const PUBLIC_BLOB_HOST_SUFFIX = '.public.blob.vercel-storage.com';

function invalidatePhotoCaches() {
  for (const tag of ['shootings', 'photos', 'index', 'archive', 'profile']) {
    revalidateTag(tag, { expire: 0 });
  }
}

function validatePublicBlobUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('The uploaded Blob URL is invalid.');
  }

  if (
    url.protocol !== 'https:' ||
    !url.hostname.endsWith(PUBLIC_BLOB_HOST_SUFFIX) ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      'The uploaded asset is not a supported public Vercel Blob.',
    );
  }

  return url;
}

export async function finalizeUploadedPhotoAsset({
  photoId,
  blobUrl,
}: {
  photoId: string;
  blobUrl: string;
}) {
  validatePublicBlobUrl(blobUrl);

  const [record] = await db
    .select({ photo: photos, shootingId: shootings.id })
    .from(photos)
    .innerJoin(shootings, eq(photos.shootingId, shootings.id))
    .where(eq(photos.id, photoId))
    .limit(1);

  if (!record) throw new Error('The target Photo row does not exist.');

  const blob = await getBlobMetadata(blobUrl);
  if (!blob) throw new Error('The uploaded Blob does not exist.');
  if (!blob.pathname.startsWith(`shootings/${record.shootingId}/`)) {
    throw new Error('The uploaded Blob does not belong to this shooting.');
  }
  if (blob.size > MAX_IMAGE_FILE_SIZE) {
    throw new Error(
      'The uploaded Blob exceeds the configured image size limit.',
    );
  }

  const response = await fetch(blob.url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(
      `The uploaded image could not be read (${response.status}).`,
    );
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const metadata = await inspectImageBuffer(buffer);
  if (metadata.fileSize !== blob.size) {
    throw new Error(
      'The uploaded image size does not match its Blob metadata.',
    );
  }
  if (metadata.contentType !== blob.contentType) {
    throw new Error(
      'The uploaded image type does not match its Blob metadata.',
    );
  }

  await db
    .update(photos)
    .set({
      url: blob.url,
      storagePath: blob.pathname,
      contentType: blob.contentType,
      fileSize: blob.size,
      blobEtag: blob.etag,
      width: metadata.width,
      height: metadata.height,
      aspectRatio: metadata.aspectRatio,
      orientation: metadata.orientation,
      uploadedAt: blob.uploadedAt,
      updatedAt: new Date(),
    })
    .where(
      and(eq(photos.id, photoId), eq(photos.shootingId, record.shootingId)),
    );

  invalidatePhotoCaches();

  return {
    id: photoId,
    url: blob.url,
    pathname: blob.pathname,
    width: metadata.width,
    height: metadata.height,
    contentType: metadata.contentType,
    fileSize: metadata.fileSize,
  };
}

export async function deleteStoredPhotoAsset(photoId: string) {
  const [record] = await db
    .select({
      id: photos.id,
      url: photos.url,
      storagePath: photos.storagePath,
      blobEtag: photos.blobEtag,
      shootingId: photos.shootingId,
      sortOrder: photos.sortOrder,
      coverPhotoId: shootings.coverPhotoId,
      featuredOnIndex: shootings.featuredOnIndex,
    })
    .from(photos)
    .innerJoin(shootings, eq(photos.shootingId, shootings.id))
    .where(eq(photos.id, photoId))
    .limit(1);

  if (!record) throw new Error('The Photo row does not exist.');
  if (!record.storagePath) {
    throw new Error('The Photo is not associated with a Blob asset.');
  }
  assertPhotoDeletionAllowed({
    photoId,
    coverPhotoId: record.coverPhotoId,
    featuredOnIndex: record.featuredOnIndex,
  });

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is missing.');
  const sql = neon(databaseUrl);
  const offset = 1_000_000_000;

  const transaction = await sql.transaction((query) => [
    query`
      update shootings
      set cover_photo_id = null, updated_at = now()
      where id = ${record.shootingId}
        and cover_photo_id = ${photoId}
        and featured_on_index = false
    `,
    query`
      delete from photos
      where id = ${photoId}
        and shooting_id = ${record.shootingId}
        and not exists (
          select 1
          from shootings
          where id = ${record.shootingId}
            and cover_photo_id = ${photoId}
            and featured_on_index = true
        )
      returning id
    `,
    query`
      update photos
      set sort_order = sort_order + ${offset}, updated_at = now()
      where shooting_id = ${record.shootingId}
        and sort_order > ${record.sortOrder}
    `,
    query`
      update photos
      set sort_order = sort_order - ${offset + 1}, updated_at = now()
      where shooting_id = ${record.shootingId}
        and sort_order >= ${offset}
    `,
  ]);

  const deleted = transaction[1] as Array<{ id: string }>;
  if (deleted.length !== 1) {
    throw new Error('The Photo row changed before it could be deleted.');
  }

  invalidatePhotoCaches();

  try {
    await deleteBlobAsset(record.url, record.blobEtag ?? undefined);
  } catch (error) {
    throw new Error(
      `The Photo row was deleted, but its Blob became orphaned at ${record.url}. Delete it manually before retrying.`,
      { cause: error },
    );
  }
}
