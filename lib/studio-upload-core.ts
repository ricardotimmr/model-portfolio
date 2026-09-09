export const STUDIO_IMAGE_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
] as const;

export const STUDIO_MAX_IMAGE_SIZE = 25 * 1024 * 1024;

export function sanitizeUploadFilename(filename: string) {
  const lastPart = filename.split(/[/\\]/).at(-1) ?? 'image';
  const dot = lastPart.lastIndexOf('.');
  const stem = (dot > 0 ? lastPart.slice(0, dot) : lastPart)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  const extension = dot > 0 ? lastPart.slice(dot + 1).toLowerCase() : '';
  return `${stem || 'image'}${extension ? `.${extension}` : ''}`;
}

export function createStudioUploadPathname(
  shootingId: string,
  filename: string,
) {
  return `shootings/${shootingId}/${sanitizeUploadFilename(filename)}`;
}

export function isStudioImageType(
  value: string,
): value is (typeof STUDIO_IMAGE_CONTENT_TYPES)[number] {
  return (STUDIO_IMAGE_CONTENT_TYPES as readonly string[]).includes(value);
}
