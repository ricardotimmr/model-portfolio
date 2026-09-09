import 'server-only';

import { cache } from 'react';
import { and, asc, desc, eq } from 'drizzle-orm';
import { unstable_cache } from 'next/cache';
import type {
  ArchiveItem,
  LocalizedText,
  PortfolioPhoto,
  Shooting,
  ShootingNavigationItem,
} from '@/lib/content';
import { db } from './index';
import { photos, shootings, type PhotoRow, type ShootingRow } from './schema';

const PUBLIC_CACHE_SECONDS = 60 * 60;

function localizedText(
  english: string | null,
  german: string | null,
): LocalizedText | undefined {
  if (!english && !german) return undefined;

  return {
    en: english ?? german ?? '',
    de: german ?? english ?? '',
  };
}

function mapPhoto(row: PhotoRow): PortfolioPhoto {
  return {
    id: row.id,
    src: row.url,
    width: row.width,
    height: row.height,
    orientation: row.orientation,
    alt: localizedText(row.altEn, row.altDe) ?? { en: '', de: '' },
    caption: localizedText(row.captionEn, row.captionDe),
    archiveVisible: row.archiveVisible,
    shootingVisible: row.shootingVisible,
    layoutHint: row.layoutHint,
  };
}

function mapShooting(
  row: ShootingRow,
  shootingPhotos: PortfolioPhoto[],
): Shooting {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    year: row.year,
    shootDate: row.shootDate?.toISOString().slice(0, 10),
    location: localizedText(row.locationEn, row.locationDe),
    description: localizedText(row.descriptionEn, row.descriptionDe),
    photographer: row.photographer ?? undefined,
    styling: row.styling ?? undefined,
    makeup: row.makeup ?? undefined,
    hair: row.hair ?? undefined,
    client: row.client ?? undefined,
    credits: row.credits ?? undefined,
    featuredOnIndex: row.featuredOnIndex,
    indexOrder: row.indexOrder ?? 0,
    coverPhotoId: row.coverPhotoId ?? shootingPhotos[0]?.id ?? '',
    photos: shootingPhotos,
  };
}

const readPublishedIndexShootings = unstable_cache(
  async (): Promise<Shooting[]> => {
    const rows = await db
      .select({ shooting: shootings, cover: photos })
      .from(shootings)
      .innerJoin(
        photos,
        and(
          eq(shootings.coverPhotoId, photos.id),
          eq(photos.shootingId, shootings.id),
        ),
      )
      .where(
        and(
          eq(shootings.status, 'published'),
          eq(shootings.featuredOnIndex, true),
        ),
      )
      .orderBy(asc(shootings.indexOrder), asc(shootings.title));

    return rows.map(({ shooting, cover }) =>
      mapShooting(shooting, [mapPhoto(cover)]),
    );
  },
  ['published-index-shootings-blob-v1'],
  {
    revalidate: PUBLIC_CACHE_SECONDS,
    tags: ['shootings', 'photos', 'index'],
  },
);

const readPublishedArchive = unstable_cache(
  async (): Promise<ArchiveItem[]> => {
    const rows = await db
      .select({ shooting: shootings, photo: photos })
      .from(photos)
      .innerJoin(shootings, eq(photos.shootingId, shootings.id))
      .where(
        and(eq(shootings.status, 'published'), eq(photos.archiveVisible, true)),
      )
      .orderBy(
        desc(shootings.year),
        asc(shootings.indexOrder),
        asc(shootings.title),
        asc(photos.sortOrder),
      );

    return rows.map(({ shooting, photo }) => ({
      photo: mapPhoto(photo),
      shooting: {
        slug: shooting.slug,
        title: shooting.title,
        year: shooting.year,
      },
    }));
  },
  ['published-archive-blob-v1'],
  {
    revalidate: PUBLIC_CACHE_SECONDS,
    tags: ['shootings', 'photos', 'archive'],
  },
);

const readPublishedShootingBySlug = unstable_cache(
  async (slug: string): Promise<Shooting | null> => {
    const [shooting] = await db
      .select()
      .from(shootings)
      .where(and(eq(shootings.slug, slug), eq(shootings.status, 'published')))
      .limit(1);

    if (!shooting) return null;

    const shootingPhotos = await db
      .select()
      .from(photos)
      .where(
        and(
          eq(photos.shootingId, shooting.id),
          eq(photos.shootingVisible, true),
        ),
      )
      .orderBy(asc(photos.sortOrder));

    return mapShooting(shooting, shootingPhotos.map(mapPhoto));
  },
  ['published-shooting-by-slug-blob-v1'],
  {
    revalidate: PUBLIC_CACHE_SECONDS,
    tags: ['shootings', 'photos'],
  },
);

const readPublishedShootingNavigation = unstable_cache(
  async (): Promise<ShootingNavigationItem[]> => {
    return db
      .select({ slug: shootings.slug, title: shootings.title })
      .from(shootings)
      .where(eq(shootings.status, 'published'))
      .orderBy(
        desc(shootings.year),
        asc(shootings.indexOrder),
        asc(shootings.title),
      );
  },
  ['published-shooting-navigation-blob-v1'],
  {
    revalidate: PUBLIC_CACHE_SECONDS,
    tags: ['shootings'],
  },
);

const readPublishedShootingSlugs = unstable_cache(
  async (): Promise<string[]> => {
    const rows = await db
      .select({ slug: shootings.slug })
      .from(shootings)
      .where(eq(shootings.status, 'published'))
      .orderBy(asc(shootings.slug));

    return rows.map(({ slug }) => slug);
  },
  ['published-shooting-slugs-blob-v1'],
  {
    revalidate: PUBLIC_CACHE_SECONDS,
    tags: ['shootings'],
  },
);

const readPublishedProfilePortrait = unstable_cache(
  async (): Promise<PortfolioPhoto | null> => {
    const [row] = await db
      .select({ photo: photos })
      .from(photos)
      .innerJoin(shootings, eq(photos.shootingId, shootings.id))
      .where(
        and(
          eq(shootings.slug, 'studio-portraits'),
          eq(shootings.status, 'published'),
          eq(photos.originalFilename, 'studio-portraits-08.jpg'),
          eq(photos.shootingVisible, true),
        ),
      )
      .limit(1);

    return row ? mapPhoto(row.photo) : null;
  },
  ['published-profile-portrait-blob-v1'],
  {
    revalidate: PUBLIC_CACHE_SECONDS,
    tags: ['shootings', 'photos', 'profile'],
  },
);

export const getPublishedIndexShootings = cache(readPublishedIndexShootings);
export const getPublishedArchive = cache(readPublishedArchive);
export const getPublishedShootingBySlug = cache(readPublishedShootingBySlug);
export const getPublishedShootingNavigation = cache(
  readPublishedShootingNavigation,
);
export const getPublishedShootingSlugs = cache(readPublishedShootingSlugs);
export const getPublishedProfilePortrait = cache(readPublishedProfilePortrait);
