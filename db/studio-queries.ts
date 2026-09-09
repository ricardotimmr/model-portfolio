import 'server-only';

import { asc, desc, eq, sql } from 'drizzle-orm';
import { requireStudioAdmin } from '@/lib/auth-session';
import {
  getPublishBlockers,
  type ShootingStatus,
} from '@/lib/studio-validation';
import { db } from './index';
import { photos, shootings } from './schema';

export type StudioPhoto = {
  id: string;
  url: string;
  storagePath: string | null;
  originalFilename: string | null;
  contentType: string | null;
  fileSize: number | null;
  width: number;
  height: number;
  orientation: 'portrait' | 'landscape' | 'square';
  altEn: string;
  altDe: string;
  captionEn: string;
  captionDe: string;
  sortOrder: number;
  archiveVisible: boolean;
  shootingVisible: boolean;
  layoutHint:
    'auto' | 'full' | 'wide' | 'medium' | 'left' | 'right' | 'pair-next';
};

export type StudioShooting = {
  id: string;
  slug: string;
  title: string;
  descriptionEn: string;
  descriptionDe: string;
  locationEn: string;
  locationDe: string;
  shootDate: string;
  year: number;
  photographer: string;
  styling: string;
  makeup: string;
  hair: string;
  client: string;
  credits: string;
  coverPhotoId: string | null;
  featuredOnIndex: boolean;
  indexOrder: number | null;
  status: ShootingStatus;
  revision: number;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  photos: StudioPhoto[];
};

export type StudioShootingListItem = Pick<
  StudioShooting,
  | 'id'
  | 'slug'
  | 'title'
  | 'shootDate'
  | 'year'
  | 'coverPhotoId'
  | 'featuredOnIndex'
  | 'indexOrder'
  | 'status'
  | 'updatedAt'
> & {
  photoCount: number;
  coverUrl: string | null;
  publishBlockers: string[];
};

function mapPhoto(row: typeof photos.$inferSelect): StudioPhoto {
  return {
    id: row.id,
    url: row.url,
    storagePath: row.storagePath,
    originalFilename: row.originalFilename,
    contentType: row.contentType,
    fileSize: row.fileSize,
    width: row.width,
    height: row.height,
    orientation: row.orientation,
    altEn: row.altEn ?? '',
    altDe: row.altDe ?? '',
    captionEn: row.captionEn ?? '',
    captionDe: row.captionDe ?? '',
    sortOrder: row.sortOrder,
    archiveVisible: row.archiveVisible,
    shootingVisible: row.shootingVisible,
    layoutHint: row.layoutHint,
  };
}

function dateValue(value: Date | null) {
  return value?.toISOString().slice(0, 10) ?? '';
}

function mapShooting(
  row: typeof shootings.$inferSelect,
  shootingPhotos: StudioPhoto[],
): StudioShooting {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    descriptionEn: row.descriptionEn ?? '',
    descriptionDe: row.descriptionDe ?? '',
    locationEn: row.locationEn ?? '',
    locationDe: row.locationDe ?? '',
    shootDate: dateValue(row.shootDate),
    year: row.year,
    photographer: row.photographer ?? '',
    styling: row.styling ?? '',
    makeup: row.makeup ?? '',
    hair: row.hair ?? '',
    client: row.client ?? '',
    credits: row.credits ?? '',
    coverPhotoId: row.coverPhotoId,
    featuredOnIndex: row.featuredOnIndex,
    indexOrder: row.indexOrder,
    status: row.status,
    revision: row.revision,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    publishedAt: row.publishedAt?.toISOString() ?? null,
    photos: shootingPhotos,
  };
}

export async function getStudioShootingList(): Promise<
  StudioShootingListItem[]
> {
  await requireStudioAdmin();

  const [shootingRows, photoRows] = await Promise.all([
    db.select().from(shootings).orderBy(desc(shootings.updatedAt)),
    db
      .select({
        id: photos.id,
        shootingId: photos.shootingId,
        url: photos.url,
        storagePath: photos.storagePath,
        shootingVisible: photos.shootingVisible,
        archiveVisible: photos.archiveVisible,
        altEn: photos.altEn,
      })
      .from(photos),
  ]);

  const photosByShooting = new Map<string, typeof photoRows>();
  for (const photo of photoRows) {
    const entries = photosByShooting.get(photo.shootingId) ?? [];
    entries.push(photo);
    photosByShooting.set(photo.shootingId, entries);
  }

  return shootingRows.map((shooting) => {
    const entries = photosByShooting.get(shooting.id) ?? [];
    const cover = entries.find((photo) => photo.id === shooting.coverPhotoId);
    const publishBlockers = getPublishBlockers({
      title: shooting.title,
      slug: shooting.slug,
      year: shooting.year,
      featuredOnIndex: shooting.featuredOnIndex,
      indexOrder: shooting.indexOrder,
      coverPhotoId: shooting.coverPhotoId,
      photos: entries,
    });

    return {
      id: shooting.id,
      slug: shooting.slug,
      title: shooting.title,
      shootDate: dateValue(shooting.shootDate),
      year: shooting.year,
      coverPhotoId: shooting.coverPhotoId,
      featuredOnIndex: shooting.featuredOnIndex,
      indexOrder: shooting.indexOrder,
      status: shooting.status,
      updatedAt: shooting.updatedAt.toISOString(),
      photoCount: entries.length,
      coverUrl: cover?.url ?? null,
      publishBlockers,
    };
  });
}

export async function getStudioShootingById(
  id: string,
): Promise<StudioShooting | null> {
  await requireStudioAdmin();

  const [shooting] = await db
    .select()
    .from(shootings)
    .where(eq(shootings.id, id))
    .limit(1);
  if (!shooting) return null;

  const photoRows = await db
    .select()
    .from(photos)
    .where(eq(photos.shootingId, id))
    .orderBy(asc(photos.sortOrder));

  return mapShooting(shooting, photoRows.map(mapPhoto));
}

export async function getStudioShootingPreview(id: string) {
  await requireStudioAdmin();
  return getStudioShootingById(id);
}

export async function getNextAvailableIndexOrder() {
  await requireStudioAdmin();
  const [highest] = await db
    .select({
      value: sql<number>`coalesce(max(${shootings.indexOrder}), -1)`,
    })
    .from(shootings)
    .where(eq(shootings.featuredOnIndex, true));

  return Number(highest?.value ?? -1) + 1;
}

export async function getPublishReadiness(id: string) {
  await requireStudioAdmin();
  const shooting = await getStudioShootingById(id);
  if (!shooting) return null;

  const blockers = getPublishBlockers({
    title: shooting.title,
    slug: shooting.slug,
    year: shooting.year,
    featuredOnIndex: shooting.featuredOnIndex,
    indexOrder: shooting.indexOrder,
    coverPhotoId: shooting.coverPhotoId,
    photos: shooting.photos,
  });

  return { ready: blockers.length === 0, blockers };
}
