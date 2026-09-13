import 'server-only';

import { basename } from 'node:path';
import { and, eq, sql } from 'drizzle-orm';
import { requireStudioAdmin } from '@/lib/auth-session';
import { deleteBlobAsset, getBlobMetadata } from '@/lib/blob';
import { inspectImageBuffer } from '@/lib/image-core';
import {
  SITE_COMP_CARD_MAX_SIZE,
  SITE_PORTRAIT_MAX_SIZE,
  siteMediaPrefix,
} from '@/lib/site-media-core';
import { SITE_SETTINGS_ID } from '@/lib/site-settings';
import {
  compCardSettingsSchema,
  finalizeSiteMediaSchema,
  portraitDetailsSchema,
  publicProfileSettingsSchema,
  yearStatementSchema,
} from '@/lib/site-settings-validation';
import { invalidateSiteSettings } from '@/lib/studio-cache';
import { StudioExpectedError } from '@/lib/studio-errors';
import { db } from './index';
import { siteSettings } from './schema';

const PUBLIC_BLOB_HOST_SUFFIX = '.public.blob.vercel-storage.com';

function siteSettingsConflict() {
  return new StudioExpectedError(
    'These site settings changed in another tab. Reload before saving.',
  );
}

function assertPublicBlobUrl(value: string) {
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
}

async function currentSettings(revision?: number) {
  const [row] = await db
    .select()
    .from(siteSettings)
    .where(eq(siteSettings.id, SITE_SETTINGS_ID))
    .limit(1);
  if (!row) throw new StudioExpectedError('The site settings row is missing.');
  if (revision !== undefined && row.revision !== revision) {
    throw siteSettingsConflict();
  }
  return row;
}

function finishUpdate<T extends { revision: number } | undefined>(updated: T) {
  if (!updated) throw siteSettingsConflict();
  invalidateSiteSettings();
  return updated;
}

export async function updatePublicProfileSettings(input: unknown) {
  await requireStudioAdmin();
  const parsed = publicProfileSettingsSchema.safeParse(input);
  if (!parsed.success) {
    throw new StudioExpectedError('Check the highlighted fields.');
  }
  await currentSettings(parsed.data.revision);
  const { id, revision, ...values } = parsed.data;
  const [updated] = await db
    .update(siteSettings)
    .set({
      ...values,
      revision: sql`${siteSettings.revision} + 1`,
      updatedAt: new Date(),
    })
    .where(and(eq(siteSettings.id, id), eq(siteSettings.revision, revision)))
    .returning({ revision: siteSettings.revision });
  return finishUpdate(updated);
}

export async function updatePortraitDetails(input: unknown) {
  await requireStudioAdmin();
  const parsed = portraitDetailsSchema.safeParse(input);
  if (!parsed.success) {
    throw new StudioExpectedError('Check the portrait details.');
  }
  const { id, revision, ...values } = parsed.data;
  const [updated] = await db
    .update(siteSettings)
    .set({
      ...values,
      revision: sql`${siteSettings.revision} + 1`,
      updatedAt: new Date(),
    })
    .where(and(eq(siteSettings.id, id), eq(siteSettings.revision, revision)))
    .returning({ revision: siteSettings.revision });
  return finishUpdate(updated);
}

export async function updateYearStatement(input: unknown) {
  await requireStudioAdmin();
  const parsed = yearStatementSchema.safeParse(input);
  if (!parsed.success) {
    throw new StudioExpectedError('Check the year statement.');
  }
  const { id, revision, ...values } = parsed.data;
  const [updated] = await db
    .update(siteSettings)
    .set({
      ...values,
      revision: sql`${siteSettings.revision} + 1`,
      updatedAt: new Date(),
    })
    .where(and(eq(siteSettings.id, id), eq(siteSettings.revision, revision)))
    .returning({ revision: siteSettings.revision });
  return finishUpdate(updated);
}

function isOwnedAsset(pathname: string | null, kind: 'portrait' | 'comp-card') {
  return Boolean(pathname?.startsWith(siteMediaPrefix(kind)));
}

async function deleteReplacedAsset(
  url: string | null,
  pathname: string | null,
  etag: string | null,
  kind: 'portrait' | 'comp-card',
) {
  if (!url || !isOwnedAsset(pathname, kind)) return undefined;
  try {
    await deleteBlobAsset(url, etag ?? undefined);
    return undefined;
  } catch {
    return `Saved, but the replaced ${kind === 'portrait' ? 'portrait' : 'Comp Card'} Blob could not be removed. Run Blob reconciliation.`;
  }
}

export async function updateCompCardSettings(input: unknown) {
  await requireStudioAdmin();
  const parsed = compCardSettingsSchema.safeParse(input);
  if (!parsed.success) {
    throw new StudioExpectedError('Check the Comp Card settings.');
  }
  const current = await currentSettings(parsed.data.revision);
  const urlChanged = parsed.data.compCardUrl !== current.compCardUrl;
  const [updated] = await db
    .update(siteSettings)
    .set({
      compCardEnabled: parsed.data.compCardEnabled,
      compCardUrl: parsed.data.compCardUrl,
      ...(urlChanged
        ? {
            compCardStoragePath: null,
            compCardOriginalFilename: null,
            compCardContentType: null,
            compCardFileSize: null,
            compCardBlobEtag: null,
          }
        : {}),
      revision: sql`${siteSettings.revision} + 1`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(siteSettings.id, SITE_SETTINGS_ID),
        eq(siteSettings.revision, parsed.data.revision),
      ),
    )
    .returning({ revision: siteSettings.revision });
  finishUpdate(updated);
  const warning = urlChanged
    ? await deleteReplacedAsset(
        current.compCardUrl,
        current.compCardStoragePath,
        current.compCardBlobEtag,
        'comp-card',
      )
    : undefined;
  return { ...updated, warning };
}

export async function finalizeSiteMedia(input: unknown) {
  await requireStudioAdmin();
  const parsed = finalizeSiteMediaSchema.safeParse(input);
  if (!parsed.success) {
    throw new StudioExpectedError(
      'The uploaded site media details are invalid.',
    );
  }
  const values = parsed.data;
  assertPublicBlobUrl(values.blobUrl);
  const blob = await getBlobMetadata(values.blobUrl);
  if (!blob) throw new StudioExpectedError('The uploaded Blob does not exist.');
  if (!blob.pathname.startsWith(siteMediaPrefix(values.kind))) {
    throw new StudioExpectedError(
      'The uploaded Blob has the wrong site-media path.',
    );
  }

  let committed = false;
  try {
    // The revision check happens after the Blob can be identified, so a stale
    // finalization can still clean up its newly uploaded owned asset.
    const current = await currentSettings(values.revision);
    const response = await fetch(blob.url, { cache: 'no-store' });
    if (!response.ok) {
      throw new StudioExpectedError('The uploaded file could not be read.');
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length !== blob.size) {
      throw new StudioExpectedError(
        'The uploaded file size does not match its metadata.',
      );
    }
    const originalFilename = basename(values.originalFilename).slice(0, 255);
    let changes: Partial<typeof siteSettings.$inferInsert>;

    if (values.kind === 'portrait') {
      if (!values.portraitAltEn) {
        throw new StudioExpectedError('English portrait alt text is required.');
      }
      if (blob.size > SITE_PORTRAIT_MAX_SIZE) {
        throw new StudioExpectedError('The portrait exceeds 25 MB.');
      }
      const metadata = await inspectImageBuffer(buffer);
      if (metadata.contentType !== blob.contentType) {
        throw new StudioExpectedError(
          'The portrait type does not match its metadata.',
        );
      }
      changes = {
        portraitUrl: blob.url,
        portraitStoragePath: blob.pathname,
        portraitOriginalFilename: originalFilename,
        portraitContentType: blob.contentType,
        portraitFileSize: blob.size,
        portraitBlobEtag: blob.etag,
        portraitWidth: metadata.width,
        portraitHeight: metadata.height,
        portraitAltEn: values.portraitAltEn,
        portraitAltDe: values.portraitAltDe ?? null,
        portraitPhotographer: values.portraitPhotographer ?? null,
        portraitCredit: values.portraitCredit ?? null,
      };
    } else {
      if (
        blob.size > SITE_COMP_CARD_MAX_SIZE ||
        blob.contentType !== 'application/pdf' ||
        buffer.subarray(0, 5).toString('ascii') !== '%PDF-'
      ) {
        throw new StudioExpectedError('Use a valid PDF no larger than 10 MB.');
      }
      changes = {
        compCardEnabled: true,
        compCardUrl: blob.url,
        compCardStoragePath: blob.pathname,
        compCardOriginalFilename: originalFilename,
        compCardContentType: blob.contentType,
        compCardFileSize: blob.size,
        compCardBlobEtag: blob.etag,
      };
    }

    const [updated] = await db
      .update(siteSettings)
      .set({
        ...changes,
        revision: sql`${siteSettings.revision} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(siteSettings.id, SITE_SETTINGS_ID),
          eq(siteSettings.revision, values.revision),
        ),
      )
      .returning({ revision: siteSettings.revision });
    committed = Boolean(updated);
    finishUpdate(updated);

    const warning = await deleteReplacedAsset(
      values.kind === 'portrait' ? current.portraitUrl : current.compCardUrl,
      values.kind === 'portrait'
        ? current.portraitStoragePath
        : current.compCardStoragePath,
      values.kind === 'portrait'
        ? current.portraitBlobEtag
        : current.compCardBlobEtag,
      values.kind,
    );
    return { ...updated, warning };
  } catch (error) {
    if (!committed) {
      try {
        await deleteBlobAsset(blob.url, blob.etag);
      } catch {
        // The database still points at the previous asset. Any failed cleanup is
        // safe to reconcile because this Blob remains inside an owned prefix.
      }
    }
    if (error instanceof StudioExpectedError) throw error;
    throw new StudioExpectedError('The uploaded file could not be finalized.');
  }
}

export async function removeCompCardAsset(input: unknown) {
  await requireStudioAdmin();
  const parsed = compCardSettingsSchema
    .pick({ id: true, revision: true })
    .safeParse(input);
  if (!parsed.success)
    throw new StudioExpectedError('Invalid Comp Card request.');
  const current = await currentSettings(parsed.data.revision);
  const [updated] = await db
    .update(siteSettings)
    .set({
      compCardEnabled: false,
      compCardUrl: null,
      compCardStoragePath: null,
      compCardOriginalFilename: null,
      compCardContentType: null,
      compCardFileSize: null,
      compCardBlobEtag: null,
      revision: sql`${siteSettings.revision} + 1`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(siteSettings.id, SITE_SETTINGS_ID),
        eq(siteSettings.revision, parsed.data.revision),
      ),
    )
    .returning({ revision: siteSettings.revision });
  finishUpdate(updated);
  const warning = await deleteReplacedAsset(
    current.compCardUrl,
    current.compCardStoragePath,
    current.compCardBlobEtag,
    'comp-card',
  );
  return { ...updated, warning };
}
