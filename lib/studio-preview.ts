import type { StudioShooting } from '@/db/studio-queries';
import type { LocalizedText, Shooting } from './content';

function localized(english: string, german: string): LocalizedText | undefined {
  if (!english && !german) return undefined;
  return {
    en: english || german,
    de: german || english,
  };
}

export function toPreviewShooting(shooting: StudioShooting): Shooting {
  const photos = shooting.photos
    .filter((photo) => photo.shootingVisible)
    .map((photo) => ({
      id: photo.id,
      src: photo.url,
      width: photo.width,
      height: photo.height,
      orientation: photo.orientation,
      alt: localized(photo.altEn, photo.altDe) ?? { en: '', de: '' },
      caption: localized(photo.captionEn, photo.captionDe),
      archiveVisible: photo.archiveVisible,
      shootingVisible: photo.shootingVisible,
      layoutHint: photo.layoutHint,
    }));

  return {
    id: shooting.id,
    slug: shooting.slug,
    title: shooting.title,
    year: shooting.year,
    shootDate: shooting.shootDate || undefined,
    location: localized(shooting.locationEn, shooting.locationDe),
    description: localized(shooting.descriptionEn, shooting.descriptionDe),
    photographer: shooting.photographer || undefined,
    styling: shooting.styling || undefined,
    makeup: shooting.makeup || undefined,
    hair: shooting.hair || undefined,
    client: shooting.client || undefined,
    credits: shooting.credits || undefined,
    featuredOnIndex: shooting.featuredOnIndex,
    indexOrder: shooting.indexOrder ?? 0,
    coverPhotoId: shooting.coverPhotoId ?? photos[0]?.id ?? '',
    photos,
  };
}
