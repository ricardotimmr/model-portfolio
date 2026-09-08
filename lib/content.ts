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
  location?: LocalizedText;
  description?: LocalizedText;
  photographer?: string;
  featuredOnIndex: boolean;
  indexOrder: number;
  coverPhotoId: string;
  photos: PortfolioPhoto[];
};

const photo = (
  shooting: string,
  filename: string,
  width: number,
  height: number,
  altEn: string,
  altDe: string,
): PortfolioPhoto => ({
  id: filename.replace('.jpg', ''),
  src: `/media/shootings/${shooting}/${filename}`,
  width,
  height,
  orientation:
    width > height ? 'landscape' : width < height ? 'portrait' : 'square',
  alt: { en: altEn, de: altDe },
  archiveVisible: true,
  shootingVisible: true,
});

export const shootings: Shooting[] = [
  {
    id: 'shooting-studio-portraits',
    slug: 'studio-portraits',
    title: 'Studio Portraits',
    year: 2026,
    description: {
      en: 'A clean studio series exploring expression, movement and the quiet details that emerge between posed moments.',
      de: 'Eine klare Studioserie über Ausdruck, Bewegung und die leisen Details, die zwischen inszenierten Momenten entstehen.',
    },
    featuredOnIndex: true,
    indexOrder: 1,
    coverPhotoId: 'studio-portraits-08',
    photos: [
      photo(
        '01-studio-portraits',
        'studio-portraits-01.jpg',
        848,
        1248,
        'Black-and-white portrait of Zoe smiling with wet hair.',
        'Schwarz-Weiß-Porträt von Zoe mit nassem Haar und einem Lächeln.',
      ),
      photo(
        '01-studio-portraits',
        'studio-portraits-02.jpg',
        848,
        1248,
        'Close color studio portrait of Zoe smiling with wet hair.',
        'Nahes Farbstudio-Porträt von Zoe mit nassem Haar und einem Lächeln.',
      ),
      photo(
        '01-studio-portraits',
        'studio-portraits-03.jpg',
        843,
        1234,
        'Black-and-white portrait of Zoe smiling over her shoulder.',
        'Schwarz-Weiß-Porträt von Zoe mit einem Lächeln über die Schulter.',
      ),
      photo(
        '01-studio-portraits',
        'studio-portraits-04.jpg',
        843,
        1234,
        'Zoe smiling with wet hair against a beige studio background.',
        'Zoe lächelt mit nassem Haar vor einem beigen Studiohintergrund.',
      ),
      photo(
        '01-studio-portraits',
        'studio-portraits-05.jpg',
        3413,
        5120,
        'Side studio portrait of Zoe smiling with a gold earring.',
        'Seitliches Studioporträt von Zoe mit einem Lächeln und goldenem Ohrring.',
      ),
      photo(
        '01-studio-portraits',
        'studio-portraits-06.jpg',
        1536,
        2304,
        'Front portrait of Zoe with wet hair and a hand at her shoulder.',
        'Frontalporträt von Zoe mit nassem Haar und einer Hand an der Schulter.',
      ),
      photo(
        '01-studio-portraits',
        'studio-portraits-07.jpg',
        1536,
        2304,
        'Close front portrait of Zoe against a beige background.',
        'Nahes Frontalporträt von Zoe vor einem beigen Hintergrund.',
      ),
      photo(
        '01-studio-portraits',
        'studio-portraits-08.jpg',
        1536,
        2304,
        'Studio portrait of Zoe with wet hair, looking over her shoulder.',
        'Studioporträt von Zoe mit nassem Haar und Blick über die Schulter.',
      ),
      photo(
        '01-studio-portraits',
        'studio-portraits-09.jpg',
        1536,
        2304,
        'Studio portrait of Zoe with loose hair and a hand at her shoulder.',
        'Studioporträt von Zoe mit offenem Haar und einer Hand an der Schulter.',
      ),
      photo(
        '01-studio-portraits',
        'studio-portraits-10.jpg',
        1536,
        2304,
        'Tight beauty portrait of Zoe wearing a gold earring.',
        'Enges Beauty-Porträt von Zoe mit goldenem Ohrring.',
      ),
    ],
  },
  {
    id: 'shooting-summer-afternoon',
    slug: 'summer-afternoon',
    title: 'Summer Afternoon',
    year: 2026,
    description: {
      en: 'An unplanned afternoon shaped by soft light, easy conversation and portraits that feel immediate and close.',
      de: 'Ein ungeplanter Nachmittag, geprägt von weichem Licht, leichten Gesprächen und Porträts, die unmittelbar und nah wirken.',
    },
    featuredOnIndex: true,
    indexOrder: 2,
    coverPhotoId: 'summer-afternoon-04',
    photos: [
      photo(
        '02-summer-afternoon',
        'summer-afternoon-01.jpg',
        3024,
        4032,
        'Zoe wearing glasses and looking down at an outdoor table.',
        'Zoe mit Brille blickt an einem Tisch im Freien nach unten.',
      ),
      photo(
        '02-summer-afternoon',
        'summer-afternoon-02.jpg',
        3024,
        4032,
        'Zoe in a white blouse lifting a hand to her hair outdoors.',
        'Zoe in weißer Bluse hebt im Freien eine Hand an ihr Haar.',
      ),
      photo(
        '02-summer-afternoon',
        'summer-afternoon-03.jpg',
        3024,
        4032,
        'Zoe wearing glasses, smiling with her chin resting on her hand.',
        'Zoe mit Brille stützt lächelnd das Kinn auf ihre Hand.',
      ),
      photo(
        '02-summer-afternoon',
        'summer-afternoon-04.jpg',
        3024,
        4032,
        'Zoe smiling in glasses and a white blouse at a garden table.',
        'Zoe lächelt mit Brille und weißer Bluse an einem Gartentisch.',
      ),
      photo(
        '02-summer-afternoon',
        'summer-afternoon-05.jpg',
        3024,
        4032,
        'Candid portrait of Zoe smiling at a table surrounded by greenery.',
        'Spontanes Porträt von Zoe lächelnd an einem Tisch im Grünen.',
      ),
      photo(
        '02-summer-afternoon',
        'summer-afternoon-06.jpg',
        3024,
        4032,
        'Close portrait of Zoe laughing outdoors in glasses.',
        'Nahes Porträt von Zoe lachend mit Brille im Außenbereich.',
      ),
      photo(
        '02-summer-afternoon',
        'summer-afternoon-07.jpg',
        3024,
        4032,
        'Zoe smiling with her head gently tilted in front of green trees.',
        'Zoe lächelt mit leicht geneigtem Kopf vor grünen Bäumen.',
      ),
      photo(
        '02-summer-afternoon',
        'summer-afternoon-08.jpg',
        3024,
        4032,
        'Zoe wearing glasses, smiling as she looks toward the table.',
        'Zoe mit Brille blickt lächelnd auf den Tisch.',
      ),
    ],
  },
  {
    id: 'shooting-mountain-light',
    slug: 'mountain-light',
    title: 'Mountain Light',
    year: 2026,
    location: { en: 'The Alps', de: 'Die Alpen' },
    description: {
      en: 'A spontaneous alpine series set between open skies, still water and the shifting light of a day in the mountains.',
      de: 'Eine spontane alpine Serie zwischen offenem Himmel, stillem Wasser und dem wechselnden Licht eines Tages in den Bergen.',
    },
    featuredOnIndex: true,
    indexOrder: 3,
    coverPhotoId: 'mountain-light-06',
    photos: [
      photo(
        '03-mountain-light',
        'mountain-light-01.jpg',
        2048,
        1366,
        'Close portrait of Zoe in front of mountains and blue sky.',
        'Nahes Porträt von Zoe vor Bergen und blauem Himmel.',
      ),
      photo(
        '03-mountain-light',
        'mountain-light-02.jpg',
        1600,
        1053,
        'Zoe on an alpine meadow in front of a wooded rock massif.',
        'Zoe auf einer Bergwiese vor einem bewaldeten Felsmassiv.',
      ),
      photo(
        '03-mountain-light',
        'mountain-light-03.jpg',
        1366,
        2048,
        'Zoe smiling while seated by a green mountain lake.',
        'Zoe sitzt lächelnd am Ufer eines grünen Bergsees.',
      ),
      photo(
        '03-mountain-light',
        'mountain-light-04.jpg',
        1366,
        2048,
        'Zoe seated in sports sunglasses against a mountain landscape.',
        'Zoe sitzt mit Sportsonnenbrille vor einer Berglandschaft.',
      ),
      photo(
        '03-mountain-light',
        'mountain-light-05.jpg',
        1366,
        2048,
        'Zoe enjoying the mountain sun with her eyes closed.',
        'Zoe genießt mit geschlossenen Augen die Sonne in den Bergen.',
      ),
      photo(
        '03-mountain-light',
        'mountain-light-06.jpg',
        1443,
        2048,
        'Zoe smiling with outstretched arms before a mountain lake and rock massif.',
        'Zoe lächelt mit ausgebreiteten Armen vor Bergsee und Felsmassiv.',
      ),
    ],
  },
];

export const featuredShootings = shootings
  .filter((shooting) => shooting.featuredOnIndex)
  .sort((a, b) => a.indexOrder - b.indexOrder);

export const archivePhotos = [...shootings]
  .sort((a, b) => b.year - a.year || a.indexOrder - b.indexOrder)
  .flatMap((shooting) =>
    shooting.photos
      .filter((photoItem) => photoItem.archiveVisible)
      .map((photoItem) => ({ photo: photoItem, shooting })),
  );

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

export function getShooting(slug: string) {
  return shootings.find((shooting) => shooting.slug === slug);
}
