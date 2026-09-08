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

export const profile = {
  name: 'Zoe Schmidt',
  base: { en: 'Wiehl / Germany', de: 'Wiehl / Deutschland' },
  bio: {
    en: 'Zoe Schmidt is a model based in Wiehl, Germany. Her portfolio brings together professional studio work and natural portraits shaped by quiet moments, light, and place.',
    de: 'Zoe Schmidt ist ein Model aus Wiehl. Ihr Portfolio verbindet professionelle Studioarbeiten mit natürlichen Porträts, geprägt von ruhigen Momenten, Licht und besonderen Orten.',
  },
  portrait: {
    src: '/media/profile/studio-portraits-08.jpg',
    width: 1536,
    height: 2304,
    alt: {
      en: 'Studio portrait of Zoe Schmidt with wet hair, looking over her shoulder.',
      de: 'Studioporträt von Zoe Schmidt mit nassem Haar und Blick über die Schulter.',
    },
  },
  instagram: {
    label: '@zoe.schmidt',
    href: 'https://www.instagram.com/zoe.schmidt/',
  },
};

export const yearStatement: LocalizedText = {
  en: 'A growing study of presence, movement and the quiet character of light — collected through portraits made in the studio and outside it.',
  de: 'Eine wachsende Studie über Präsenz, Bewegung und den stillen Charakter des Lichts – gesammelt in Porträts aus dem Studio und darüber hinaus.',
};

export function getCover(shooting: Shooting) {
  return (
    shooting.photos.find((item) => item.id === shooting.coverPhotoId) ??
    shooting.photos[0]
  );
}
