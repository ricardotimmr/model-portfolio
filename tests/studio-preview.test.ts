import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { StudioShooting } from '../db/studio-queries';
import { toPreviewShooting } from '../lib/studio-preview';

const basePhoto = {
  storagePath: 'shootings/id/photo.jpg',
  originalFilename: 'photo.jpg',
  contentType: 'image/jpeg',
  fileSize: 100,
  width: 1200,
  height: 1800,
  orientation: 'portrait' as const,
  altEn: 'English alt',
  altDe: '',
  captionEn: '',
  captionDe: '',
  sortOrder: 0,
  archiveVisible: true,
  shootingVisible: true,
  layoutHint: 'left' as const,
};

test('builds a saved preview with localization fallback and hidden-photo filtering', () => {
  const shooting: StudioShooting = {
    id: '11111111-1111-4111-8111-111111111111',
    slug: 'preview-test',
    title: 'Preview Test',
    descriptionEn: 'English description',
    descriptionDe: '',
    locationEn: '',
    locationDe: 'Berlin',
    shootDate: '2026-09-09',
    year: 2026,
    photographer: '',
    styling: '',
    makeup: '',
    hair: '',
    client: '',
    credits: '',
    coverPhotoId: null,
    featuredOnIndex: false,
    indexOrder: null,
    status: 'draft',
    revision: 2,
    createdAt: '2026-09-09T00:00:00.000Z',
    updatedAt: '2026-09-09T00:00:00.000Z',
    publishedAt: null,
    photos: [
      {
        ...basePhoto,
        id: '22222222-2222-4222-8222-222222222222',
        url: 'https://example.com/visible.jpg',
      },
      {
        ...basePhoto,
        id: '33333333-3333-4333-8333-333333333333',
        url: 'https://example.com/hidden.jpg',
        shootingVisible: false,
        sortOrder: 1,
      },
    ],
  };

  const preview = toPreviewShooting(shooting);
  assert.equal(preview.photos.length, 1);
  assert.deepEqual(preview.description, {
    en: 'English description',
    de: 'English description',
  });
  assert.deepEqual(preview.location, { en: 'Berlin', de: 'Berlin' });
  assert.equal(preview.photos[0]?.alt.de, 'English alt');
  assert.equal(preview.photos[0]?.layoutHint, 'left');
  assert.equal(preview.coverPhotoId, preview.photos[0]?.id);
});
