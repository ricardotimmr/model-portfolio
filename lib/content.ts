export type Language = 'en' | 'de';

export type LocalizedText = Record<Language, string>;

export type PhotoOrientation = 'portrait' | 'landscape' | 'square';

export type PortfolioPhoto = {
  id: string;
  src: string;
  width: number;
  height: number;
  orientation: PhotoOrientation;
  alt: LocalizedText;
  caption?: LocalizedText;
  archiveVisible: boolean;
  shootingVisible: boolean;
  layoutHint?:
    'auto' | 'full' | 'wide' | 'medium' | 'left' | 'right' | 'pair-next';
};

export type Shooting = {
  id: string;
  slug: string;
  title: string;
  year: number;
  shootDate?: string;
  location?: LocalizedText;
  description?: LocalizedText;
  photographer?: string;
  styling?: string;
  makeup?: string;
  hair?: string;
  client?: string;
  credits?: string;
  featuredOnIndex: boolean;
  indexOrder: number;
  coverPhotoId: string;
  photos: PortfolioPhoto[];
};

export type ShootingNavigationItem = Pick<Shooting, 'slug' | 'title'>;

export type ArchiveItem = {
  photo: PortfolioPhoto;
  shooting: Pick<Shooting, 'slug' | 'title' | 'year'>;
};

export function getCover(shooting: Shooting) {
  return (
    shooting.photos.find((item) => item.id === shooting.coverPhotoId) ??
    shooting.photos[0]
  );
}
