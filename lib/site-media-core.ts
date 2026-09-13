import { sanitizeUploadFilename } from './studio-upload-core';

export const SITE_MEDIA_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
] as const;
export const SITE_MEDIA_PDF_TYPES = ['application/pdf'] as const;
export const SITE_PORTRAIT_MAX_SIZE = 25 * 1024 * 1024;
export const SITE_COMP_CARD_MAX_SIZE = 10 * 1024 * 1024;

export type SiteMediaKind = 'portrait' | 'comp-card';

export function createSiteMediaPathname(kind: SiteMediaKind, filename: string) {
  return `site/profile/${kind}/${sanitizeUploadFilename(filename)}`;
}

export function siteMediaPrefix(kind: SiteMediaKind) {
  return `site/profile/${kind}/`;
}

export function isSitePortraitType(value: string) {
  return (SITE_MEDIA_IMAGE_TYPES as readonly string[]).includes(value);
}

export function isSiteCompCardType(value: string) {
  return value === 'application/pdf';
}
