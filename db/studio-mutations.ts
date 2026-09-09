import 'server-only';

import { neon } from '@neondatabase/serverless';
import { and, asc, eq, ne, sql } from 'drizzle-orm';
import { requireStudioAdmin } from '@/lib/auth-session';
import { deleteBlobAsset } from '@/lib/blob';
import { createSlug } from '@/lib/slug';
import { StudioConflictError, StudioExpectedError } from '@/lib/studio-errors';
import {
  canTransitionShooting,
  createShootingSchema,
  deleteShootingSchema,
  getPublishBlockers,
  photoDetailsBatchSchema,
  photoOrderSchema,
  shootingPresentationSchema,
  shootingTransitionSchema,
  shootingMetadataSchema,
  type ShootingMetadataInput,
  validateExactPhotoOrder,
} from '@/lib/studio-validation';
import { invalidatePublicPortfolio } from '@/lib/studio-cache';
import { db } from './index';
import { photos, shootings } from './schema';

async function findAvailableSlug(value: string) {
  const base = createSlug(value);
  if (!base) throw new StudioExpectedError('Enter a valid slug.');

  for (let suffix = 1; suffix < 1000; suffix += 1) {
    const candidate = suffix === 1 ? base : `${base}-${suffix}`;
    const [existing] = await db
      .select({ id: shootings.id })
      .from(shootings)
      .where(eq(shootings.slug, candidate))
      .limit(1);
    if (!existing) return candidate;
  }

  throw new StudioExpectedError('Could not create a unique slug.');
}

export async function createStudioShooting(input: unknown) {
  await requireStudioAdmin();
  const parsed = createShootingSchema.safeParse(input);
  if (!parsed.success) {
    throw new StudioExpectedError('Check the highlighted fields.');
  }

  const slug = await findAvailableSlug(parsed.data.slug || parsed.data.title);
  const [created] = await db
    .insert(shootings)
    .values({
      title: parsed.data.title,
      slug,
      shootDate: parsed.data.shootDate
        ? new Date(`${parsed.data.shootDate}T00:00:00.000Z`)
        : null,
      year: parsed.data.year,
      status: 'draft',
      featuredOnIndex: false,
      indexOrder: null,
    })
    .returning({ id: shootings.id, slug: shootings.slug });

  if (!created) throw new Error('The shooting could not be created.');
  return created;
}

async function assertSlugAvailable(slug: string, shootingId: string) {
  const [existing] = await db
    .select({ id: shootings.id })
    .from(shootings)
    .where(and(eq(shootings.slug, slug), ne(shootings.id, shootingId)))
    .limit(1);

  if (existing) {
    throw new StudioExpectedError('This slug is already in use.', {
      slug: 'Choose a different slug.',
    });
  }
}

export async function updateStudioShootingMetadata(input: unknown) {
  await requireStudioAdmin();
  const parsed = shootingMetadataSchema.safeParse(input);
  if (!parsed.success) {
    throw new StudioExpectedError('Check the highlighted fields.');
  }

  const values: ShootingMetadataInput = parsed.data;
  const [current] = await db
    .select({
      slug: shootings.slug,
      status: shootings.status,
      revision: shootings.revision,
    })
    .from(shootings)
    .where(eq(shootings.id, values.id))
    .limit(1);

  if (!current) throw new StudioExpectedError('The shooting no longer exists.');
  if (current.revision !== values.revision) throw new StudioConflictError();
  if (current.status !== 'draft' && current.slug !== values.slug) {
    throw new StudioExpectedError(
      'The slug is locked after the shooting has been published.',
      { slug: 'Unpublish before changing the slug.' },
    );
  }

  await assertSlugAvailable(values.slug, values.id);

  const [updated] = await db
    .update(shootings)
    .set({
      title: values.title,
      slug: values.slug,
      shootDate: values.shootDate
        ? new Date(`${values.shootDate}T00:00:00.000Z`)
        : null,
      year: values.year,
      locationEn: values.locationEn,
      locationDe: values.locationDe,
      descriptionEn: values.descriptionEn,
      descriptionDe: values.descriptionDe,
      photographer: values.photographer,
      styling: values.styling,
      makeup: values.makeup,
      hair: values.hair,
      client: values.client,
      credits: values.credits,
      revision: sql`${shootings.revision} + 1`,
      updatedAt: new Date(),
    })
    .where(
      and(eq(shootings.id, values.id), eq(shootings.revision, values.revision)),
    )
    .returning({
      revision: shootings.revision,
      slug: shootings.slug,
      status: shootings.status,
    });

  if (!updated) throw new StudioConflictError();
  if (current.status === 'published') {
    invalidatePublicPortfolio({ oldSlug: current.slug, slug: updated.slug });
  }

  return updated;
}

async function getShootingAndPhotos(shootingId: string) {
  const [shooting] = await db
    .select()
    .from(shootings)
    .where(eq(shootings.id, shootingId))
    .limit(1);
  if (!shooting)
    throw new StudioExpectedError('The shooting no longer exists.');

  const photoRows = await db
    .select()
    .from(photos)
    .where(eq(photos.shootingId, shootingId))
    .orderBy(asc(photos.sortOrder));

  return { shooting, photos: photoRows };
}

function getDatabaseUrl() {
  const value = process.env.DATABASE_URL;
  if (!value) throw new Error('DATABASE_URL is missing.');
  return value;
}

export async function updateStudioPhotoDetails(input: unknown) {
  await requireStudioAdmin();
  const parsed = photoDetailsBatchSchema.safeParse(input);
  if (!parsed.success) {
    throw new StudioExpectedError('The photo details are invalid.');
  }

  const current = await getShootingAndPhotos(parsed.data.shootingId);
  if (current.shooting.revision !== parsed.data.revision) {
    throw new StudioConflictError();
  }
  if (
    !validateExactPhotoOrder(
      parsed.data.photos.map((photo) => photo.id),
      current.photos.map((photo) => photo.id),
    )
  ) {
    throw new StudioExpectedError(
      'The photo set changed. Reload before saving.',
    );
  }

  const query = neon(getDatabaseUrl());
  const results = await query.transaction((transaction) => [
    transaction`
      select id from shootings
      where id = ${parsed.data.shootingId}
        and revision = ${parsed.data.revision}
      for update
    `,
    ...parsed.data.photos.map(
      (photo) => transaction`
        update photos
        set
          alt_en = ${photo.altEn},
          alt_de = ${photo.altDe},
          caption_en = ${photo.captionEn},
          caption_de = ${photo.captionDe},
          archive_visible = ${photo.archiveVisible},
          shooting_visible = ${photo.shootingVisible},
          layout_hint = ${photo.layoutHint},
          updated_at = now()
        where id = ${photo.id}
          and shooting_id = ${parsed.data.shootingId}
          and exists (
            select 1 from shootings
            where id = ${parsed.data.shootingId}
              and revision = ${parsed.data.revision}
          )
      `,
    ),
    transaction`
      update shootings
      set revision = revision + 1, updated_at = now()
      where id = ${parsed.data.shootingId}
        and revision = ${parsed.data.revision}
      returning revision
    `,
  ]);
  const updated = results.at(-1) as Array<{ revision: number }>;
  if (!updated[0]) throw new StudioConflictError();

  if (current.shooting.status === 'published') {
    invalidatePublicPortfolio({ slug: current.shooting.slug });
  }
  return { revision: updated[0].revision };
}

export async function reorderStudioPhotos(input: unknown) {
  await requireStudioAdmin();
  const parsed = photoOrderSchema.safeParse(input);
  if (!parsed.success)
    throw new StudioExpectedError('The photo order is invalid.');

  const current = await getShootingAndPhotos(parsed.data.shootingId);
  if (current.shooting.revision !== parsed.data.revision) {
    throw new StudioConflictError();
  }
  if (
    !validateExactPhotoOrder(
      parsed.data.photoIds,
      current.photos.map((photo) => photo.id),
    )
  ) {
    throw new StudioExpectedError(
      'The photo set changed. Reload before ordering.',
    );
  }

  const query = neon(getDatabaseUrl());
  const offset = 1_000_000_000;
  const results = await query.transaction((transaction) => [
    transaction`
      select id from shootings
      where id = ${parsed.data.shootingId}
        and revision = ${parsed.data.revision}
      for update
    `,
    transaction`
      update photos
      set sort_order = sort_order + ${offset}, updated_at = now()
      where shooting_id = ${parsed.data.shootingId}
        and exists (
          select 1 from shootings
          where id = ${parsed.data.shootingId}
            and revision = ${parsed.data.revision}
        )
    `,
    ...parsed.data.photoIds.map(
      (photoId, index) => transaction`
        update photos
        set sort_order = ${index}, updated_at = now()
        where id = ${photoId}
          and shooting_id = ${parsed.data.shootingId}
          and sort_order >= ${offset}
      `,
    ),
    transaction`
      update shootings
      set revision = revision + 1, updated_at = now()
      where id = ${parsed.data.shootingId}
        and revision = ${parsed.data.revision}
      returning revision
    `,
  ]);
  const updated = results.at(-1) as Array<{ revision: number }>;
  if (!updated[0]) throw new StudioConflictError();

  if (current.shooting.status === 'published') {
    invalidatePublicPortfolio({ slug: current.shooting.slug });
  }
  return { revision: updated[0].revision };
}

export async function updateStudioPresentation(input: unknown) {
  await requireStudioAdmin();
  const parsed = shootingPresentationSchema.safeParse(input);
  if (!parsed.success) {
    throw new StudioExpectedError('The cover or INDEX settings are invalid.');
  }

  const current = await getShootingAndPhotos(parsed.data.shootingId);
  if (current.shooting.revision !== parsed.data.revision) {
    throw new StudioConflictError();
  }

  const cover = parsed.data.coverPhotoId
    ? current.photos.find((photo) => photo.id === parsed.data.coverPhotoId)
    : null;
  if (parsed.data.coverPhotoId && !cover) {
    throw new StudioExpectedError('The selected cover does not belong here.');
  }
  if (parsed.data.featuredOnIndex && !cover?.storagePath) {
    throw new StudioExpectedError(
      'Select a finalized cover before featuring this shooting.',
    );
  }

  let indexOrder: number | null = null;
  if (parsed.data.featuredOnIndex) {
    if (parsed.data.indexOrder !== null) {
      indexOrder = parsed.data.indexOrder;
    } else {
      const [highest] = await db
        .select({
          value: sql<number>`coalesce(max(${shootings.indexOrder}), -1)`,
        })
        .from(shootings)
        .where(eq(shootings.featuredOnIndex, true));
      indexOrder = Number(highest?.value ?? -1) + 1;
    }
  }

  const query = neon(getDatabaseUrl());
  const results = await query.transaction((transaction) => [
    transaction`select pg_advisory_xact_lock(hashtext('studio-index-order'))`,
    transaction`
      with target as materialized (
        select id, featured_on_index, index_order
        from shootings
        where id = ${parsed.data.shootingId}
          and revision = ${parsed.data.revision}
        for update
      ), shifted as materialized (
        update shootings
        set index_order = index_order + 1, updated_at = now()
        where ${parsed.data.featuredOnIndex}
          and featured_on_index
          and id <> ${parsed.data.shootingId}
          and index_order >= ${indexOrder}
          and exists (
            select 1 from target
            where not featured_on_index
               or index_order is distinct from ${indexOrder}
          )
      )
      update shootings
      set cover_photo_id = ${parsed.data.coverPhotoId},
          featured_on_index = ${parsed.data.featuredOnIndex},
          index_order = ${indexOrder},
          revision = revision + 1,
          updated_at = now()
      where id = ${parsed.data.shootingId}
        and revision = ${parsed.data.revision}
        and exists (select 1 from target)
      returning revision
    `,
  ]);
  const updatedRows = results[1] as Array<{ revision: number }>;
  const updated = updatedRows[0];

  if (!updated) throw new StudioConflictError();
  if (current.shooting.status === 'published') {
    invalidatePublicPortfolio({ slug: current.shooting.slug });
  }
  return { revision: updated.revision };
}

export async function transitionStudioShooting(input: unknown) {
  await requireStudioAdmin();
  const parsed = shootingTransitionSchema.safeParse(input);
  if (!parsed.success) throw new StudioExpectedError('Invalid status change.');

  const current = await getShootingAndPhotos(parsed.data.shootingId);
  if (current.shooting.revision !== parsed.data.revision) {
    throw new StudioConflictError();
  }
  if (!canTransitionShooting(current.shooting.status, parsed.data.to)) {
    throw new StudioExpectedError('This status change is not allowed.');
  }

  if (parsed.data.to === 'published') {
    const blockers = getPublishBlockers({
      title: current.shooting.title,
      slug: current.shooting.slug,
      year: current.shooting.year,
      featuredOnIndex: current.shooting.featuredOnIndex,
      indexOrder: current.shooting.indexOrder,
      coverPhotoId: current.shooting.coverPhotoId,
      photos: current.photos,
    });
    if (blockers.length) {
      throw new StudioExpectedError(blockers.join(' '));
    }
  }

  const [updated] = await db
    .update(shootings)
    .set({
      status: parsed.data.to,
      publishedAt:
        parsed.data.to === 'published'
          ? (current.shooting.publishedAt ?? new Date())
          : current.shooting.publishedAt,
      revision: sql`${shootings.revision} + 1`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(shootings.id, parsed.data.shootingId),
        eq(shootings.revision, parsed.data.revision),
      ),
    )
    .returning({ revision: shootings.revision });

  if (!updated) throw new StudioConflictError();
  if (
    current.shooting.status === 'published' ||
    parsed.data.to === 'published'
  ) {
    invalidatePublicPortfolio({ slug: current.shooting.slug });
  }
  return { revision: updated.revision, status: parsed.data.to };
}

export async function deleteStudioShooting(input: unknown) {
  await requireStudioAdmin();
  const parsed = deleteShootingSchema.safeParse(input);
  if (!parsed.success) {
    throw new StudioExpectedError('The deletion confirmation is invalid.');
  }

  const current = await getShootingAndPhotos(parsed.data.shootingId);
  if (current.shooting.revision !== parsed.data.revision) {
    throw new StudioConflictError();
  }
  if (current.shooting.status === 'published') {
    throw new StudioExpectedError(
      'Unpublish or archive this shooting before deleting it.',
    );
  }
  if (parsed.data.confirmation !== current.shooting.title) {
    throw new StudioExpectedError(
      'Type the exact shooting title to delete it.',
    );
  }

  const [deleted] = await db
    .delete(shootings)
    .where(
      and(
        eq(shootings.id, parsed.data.shootingId),
        eq(shootings.revision, parsed.data.revision),
        ne(shootings.status, 'published'),
      ),
    )
    .returning({ id: shootings.id });
  if (!deleted) throw new StudioConflictError();

  const assets = current.photos.filter((photo) => photo.storagePath);
  const failures: string[] = [];
  for (let index = 0; index < assets.length; index += 3) {
    const batch = assets.slice(index, index + 3);
    const results = await Promise.allSettled(
      batch.map((photo) =>
        deleteBlobAsset(photo.url, photo.blobEtag ?? undefined),
      ),
    );
    results.forEach((result, resultIndex) => {
      if (result.status === 'rejected') {
        failures.push(batch[resultIndex]?.storagePath ?? 'unknown asset');
      }
    });
  }

  invalidatePublicPortfolio({
    slug: current.shooting.slug,
    profile: current.shooting.slug === 'studio-portraits',
  });
  if (failures.length) {
    return {
      deleted: true as const,
      warning: `The shooting was deleted, but ${failures.length} Blob asset(s) require manual cleanup: ${failures.join(', ')}`,
    };
  }

  return { deleted: true as const };
}
