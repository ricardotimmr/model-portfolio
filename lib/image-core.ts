import { basename, extname } from 'node:path';
import sharp from 'sharp';
import type { PhotoOrientation } from './content';

type SharpMetadata = Awaited<ReturnType<ReturnType<typeof sharp>['metadata']>>;

export const MAX_IMAGE_FILE_SIZE = 25 * 1024 * 1024;

const SUPPORTED_FORMATS = {
  jpeg: { contentType: 'image/jpeg', extension: 'jpg' },
  png: { contentType: 'image/png', extension: 'png' },
  webp: { contentType: 'image/webp', extension: 'webp' },
  avif: { contentType: 'image/avif', extension: 'avif' },
} as const;

export const ALLOWED_IMAGE_CONTENT_TYPES = Object.values(SUPPORTED_FORMATS).map(
  ({ contentType }) => contentType,
);

export type ImageMetadata = {
  width: number;
  height: number;
  aspectRatio: number;
  orientation: PhotoOrientation;
  contentType: (typeof ALLOWED_IMAGE_CONTENT_TYPES)[number];
  extension: string;
  fileSize: number;
};

export function sanitizeFilename(filename: string) {
  const extension = extname(filename);
  const stem = basename(filename, extension)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

  return stem || 'image';
}

export function createMigrationBlobPathname(
  shootingSlug: string,
  photoId: string,
  extension: string,
) {
  return `shootings/${sanitizeFilename(shootingSlug)}/${photoId}.${extension}`;
}

export function createStudioBlobPathname(
  shootingId: string,
  originalFilename: string,
  extension: string,
) {
  return `shootings/${shootingId}/${sanitizeFilename(originalFilename)}.${extension}`;
}

export async function inspectImageBuffer(
  buffer: Buffer,
): Promise<ImageMetadata> {
  if (buffer.length === 0) throw new Error('The image file is empty.');
  if (buffer.length > MAX_IMAGE_FILE_SIZE) {
    throw new Error(
      `The image exceeds the ${MAX_IMAGE_FILE_SIZE / 1024 / 1024} MB upload limit.`,
    );
  }

  let metadata: SharpMetadata;
  try {
    metadata = await sharp(buffer, {
      failOn: 'error',
      limitInputPixels: 120_000_000,
    }).metadata();
  } catch {
    throw new Error('The file is not a readable image.');
  }

  const format =
    SUPPORTED_FORMATS[metadata.format as keyof typeof SUPPORTED_FORMATS];
  if (!format) {
    throw new Error('Unsupported image format. Use JPEG, PNG, WebP, or AVIF.');
  }

  const width = metadata.autoOrient.width;
  const height = metadata.autoOrient.height;
  if (!width || !height) {
    throw new Error('The image dimensions could not be determined.');
  }

  return {
    width,
    height,
    aspectRatio: width / height,
    orientation:
      width > height ? 'landscape' : width < height ? 'portrait' : 'square',
    contentType: format.contentType,
    extension: format.extension,
    fileSize: buffer.length,
  };
}
