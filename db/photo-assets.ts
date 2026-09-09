import 'server-only';

import { randomUUID } from 'node:crypto';
import { basename } from 'node:path';
import { neon } from '@neondatabase/serverless';
import { eq } from 'drizzle-orm';
import { revalidateTag } from 'next/cache';
import { deleteBlobAsset, getBlobMetadata } from '@/lib/blob';
import { requireStudioAdmin } from '@/lib/auth-session';
import { inspectImageBuffer, MAX_IMAGE_FILE_SIZE } from '@/lib/images';
import { assertPhotoDeletionAllowed } from '@/lib/photo-asset-core';
import { StudioExpectedError } from '@/lib/studio-errors';
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
    throw new StudioExpectedError('The uploaded Blob URL is invalid.');
  }

  if (
    url.protocol !== 'https:' ||
    !url.hostname.endsWith(PUBLIC_BLOB_HOST_SUFFIX) ||
    url.search ||
    url.hash
  ) {
    throw new StudioExpectedError(
      'The uploaded asset is not a supported public Vercel Blob.',
    );
  }

  return url;
}

export async function finalizeUploadedPhotoAsset({
  shootingId,
  blobUrl,
  originalFilename,
}: {
  shootingId: string;
  blobUrl: string;
  originalFilename: string;
}) {
  await requireStudioAdmin();
  validatePublicBlobUrl(blobUrl);

  const [shooting] = await db
    .select({
      id: shootings.id,
      status: shootings.status,
    })
    .from(shootings)
    .where(eq(shootings.id, shootingId))
    .limit(1);

  if (!shooting) {
    throw new StudioExpectedError('The target shooting does not exist.');
  }

  const blob = await getBlobMetadata(blobUrl);
  if (!blob) throw new StudioExpectedError('The uploaded Blob does not exist.');
  if (!blob.pathname.startsWith(`shootings/${shooting.id}/`)) {
    throw new StudioExpectedError(
      'The uploaded Blob does not belong to this shooting.',
    );
  }
  if (blob.size > MAX_IMAGE_FILE_SIZE) {
    throw new StudioExpectedError(
      'The uploaded Blob exceeds the configured image size limit.',
    );
  }

  try {
    const response = await fetch(blob.url, { cache: 'no-store' });
    if (!response.ok) {
      throw new StudioExpectedError(
        `The uploaded image could not be read (${response.status}).`,
      );
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const metadata = await inspectImageBuffer(buffer);
    if (metadata.fileSize !== blob.size) {
      throw new StudioExpectedError(
        'The uploaded image size does not match its Blob metadata.',
      );
    }
    if (metadata.contentType !== blob.contentType) {
      throw new StudioExpectedError(
        'The uploaded image type does not match its Blob metadata.',
      );
    }

    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) throw new Error('DATABASE_URL is missing.');
    const sql = neon(databaseUrl);
    const photoId = randomUUID();
    const filename = basename(originalFilename).slice(0, 255) || null;

    const transaction = await sql.transaction((query) => [
      query`select pg_advisory_xact_lock(hashtext(${shooting.id}))`,
      query`select id from shootings where id = ${shooting.id} for update`,
      query`
        insert into photos (
          id, shooting_id, url, storage_path, original_filename,
          content_type, file_size, blob_etag, width, height, aspect_ratio,
          orientation, alt_en, alt_de, caption_en, caption_de, sort_order,
          archive_visible, shooting_visible, layout_hint, uploaded_at
        )
        select
          ${photoId}, ${shooting.id}, ${blob.url}, ${blob.pathname}, ${filename},
          ${blob.contentType}, ${blob.size}, ${blob.etag}, ${metadata.width},
          ${metadata.height}, ${metadata.aspectRatio}, ${metadata.orientation},
          null, null, null, null, coalesce(max(sort_order), -1) + 1,
          (select status <> 'published' from shootings where id = ${shooting.id}),
          (select status <> 'published' from shootings where id = ${shooting.id}),
          'auto', ${blob.uploadedAt}
        from photos
        where shooting_id = ${shooting.id}
        returning id, sort_order
      `,
      query`
        update shootings
        set revision = revision + 1, updated_at = now()
        where id = ${shooting.id}
        returning revision
      `,
    ]);

    const inserted = transaction[2] as Array<{
      id: string;
      sort_order: number;
    }>;
    const updated = transaction[3] as Array<{ revision: number }>;
    if (!inserted[0] || !updated[0]) {
      throw new StudioExpectedError(
        'The uploaded photo could not be finalized.',
      );
    }

    invalidatePhotoCaches();

    return {
      id: photoId,
      url: blob.url,
      pathname: blob.pathname,
      width: metadata.width,
      height: metadata.height,
      contentType: metadata.contentType,
      fileSize: metadata.fileSize,
      sortOrder: inserted[0].sort_order,
      revision: updated[0].revision,
    };
  } catch (error) {
    try {
      await deleteBlobAsset(blob.url, blob.etag);
    } catch (cleanupError) {
      const reason = error instanceof Error ? error.message : 'Unknown error.';
      throw new StudioExpectedError(
        `${reason} Blob cleanup also failed for ${blob.pathname}; run reconciliation.`,
        undefined,
        { cause: cleanupError },
      );
    }
    if (error instanceof StudioExpectedError) throw error;
    throw new StudioExpectedError(
      'The uploaded image could not be validated or finalized.',
    );
  }
}

export async function deleteStoredPhotoAsset({
  photoId,
  shootingId,
  revision,
}: {
  photoId: string;
  shootingId: string;
  revision: number;
}) {
  await requireStudioAdmin();
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

  if (!record) throw new StudioExpectedError('The Photo row does not exist.');
  if (record.shootingId !== shootingId) {
    throw new StudioExpectedError(
      'The Photo does not belong to this shooting.',
    );
  }
  if (!record.storagePath) {
    throw new StudioExpectedError(
      'The Photo is not associated with a Blob asset.',
    );
  }
  try {
    assertPhotoDeletionAllowed({
      photoId,
      coverPhotoId: record.coverPhotoId,
      featuredOnIndex: record.featuredOnIndex,
    });
  } catch (error) {
    throw new StudioExpectedError(
      error instanceof Error
        ? error.message
        : 'Select a replacement cover before deleting this photo.',
    );
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is missing.');
  const sql = neon(databaseUrl);
  const offset = 1_000_000_000;

  const transaction = await sql.transaction((query) => [
    query`
      select id from shootings
      where id = ${record.shootingId} and revision = ${revision}
      for update
    `,
    query`
      update shootings
      set cover_photo_id = null, updated_at = now()
      where id = ${record.shootingId}
        and revision = ${revision}
        and cover_photo_id = ${photoId}
        and featured_on_index = false
    `,
    query`
      delete from photos
      where id = ${photoId}
        and shooting_id = ${record.shootingId}
        and exists (
          select 1 from shootings
          where id = ${record.shootingId} and revision = ${revision}
        )
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
        and exists (
          select 1 from shootings
          where id = ${record.shootingId} and revision = ${revision}
        )
    `,
    query`
      update photos
      set sort_order = sort_order - ${offset + 1}, updated_at = now()
      where shooting_id = ${record.shootingId}
        and sort_order >= ${offset}
        and exists (
          select 1 from shootings
          where id = ${record.shootingId} and revision = ${revision}
        )
    `,
    query`
      update shootings
      set revision = revision + 1, updated_at = now()
      where id = ${record.shootingId}
        and revision = ${revision}
        and not exists (select 1 from photos where id = ${photoId})
      returning revision
    `,
  ]);

  const deleted = transaction[2] as Array<{ id: string }>;
  if (deleted.length !== 1) {
    throw new StudioExpectedError(
      'The Photo changed before it could be deleted. Reload and try again.',
    );
  }
  const revised = transaction[5] as Array<{ revision: number }>;
  if (!revised[0]) {
    throw new StudioExpectedError(
      'The shooting changed before the photo could be deleted. Reload and try again.',
    );
  }

  invalidatePhotoCaches();

  let warning: string | undefined;
  try {
    await deleteBlobAsset(record.url, record.blobEtag ?? undefined);
  } catch {
    warning = `The Photo was removed from the portfolio, but its Blob became orphaned at ${record.url}. Delete it manually or run reconciliation.`;
  }

  return { revision: revised[0].revision, warning };
}
