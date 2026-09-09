import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createSlug, isCanonicalSlug } from '../lib/slug';
import {
  canTransitionShooting,
  getPublishBlockers,
  shootingMetadataSchema,
  validateExactPhotoOrder,
} from '../lib/studio-validation';

test('creates a canonical slug from editorial titles', () => {
  assert.equal(createSlug('  Été in Köln — No. 03  '), 'ete-in-koln-no-03');
  assert.equal(isCanonicalSlug('ete-in-koln-no-03'), true);
  assert.equal(isCanonicalSlug('Été in Köln'), false);
});

test('normalizes optional metadata and rejects impossible dates', () => {
  const base = {
    id: '11111111-1111-4111-8111-111111111111',
    revision: 0,
    title: '  Studio Test  ',
    slug: 'studio-test',
    year: 2026,
    locationEn: '   ',
    locationDe: '  Köln  ',
    descriptionEn: '',
    descriptionDe: '',
    photographer: '',
    styling: '',
    makeup: '',
    hair: '',
    client: '',
    credits: '',
  };

  const parsed = shootingMetadataSchema.parse({
    ...base,
    shootDate: '2026-09-09',
  });
  assert.equal(parsed.title, 'Studio Test');
  assert.equal(parsed.locationEn, null);
  assert.equal(parsed.locationDe, 'Köln');
  assert.equal(
    shootingMetadataSchema.safeParse({
      ...base,
      shootDate: '2026-02-30',
    }).success,
    false,
  );
});

test('accepts only complete exact photo orders', () => {
  const stored = ['a', 'b', 'c'];
  assert.equal(validateExactPhotoOrder(['c', 'a', 'b'], stored), true);
  assert.equal(validateExactPhotoOrder(['a', 'a', 'c'], stored), false);
  assert.equal(validateExactPhotoOrder(['a', 'b'], stored), false);
  assert.equal(validateExactPhotoOrder(['a', 'b', 'x'], stored), false);
});

test('allows only deliberate shooting status transitions', () => {
  assert.equal(canTransitionShooting('draft', 'published'), true);
  assert.equal(canTransitionShooting('published', 'draft'), true);
  assert.equal(canTransitionShooting('archived', 'draft'), true);
  assert.equal(canTransitionShooting('archived', 'published'), false);
  assert.equal(canTransitionShooting('draft', 'draft'), false);
});

test('returns every publication blocker in one pass', () => {
  assert.deepEqual(
    getPublishBlockers({
      title: '',
      slug: 'Not valid',
      year: 2200,
      featuredOnIndex: true,
      indexOrder: null,
      coverPhotoId: null,
      photos: [],
    }),
    [
      'Enter a title.',
      'Enter a valid slug.',
      'Enter a valid year.',
      'Upload at least one image.',
      'Show at least one image on the shooting page.',
      'Select a finalized cover image.',
      'Set a valid INDEX order.',
    ],
  );
});

test('requires English alt text for every publicly visible photo', () => {
  const blockers = getPublishBlockers({
    title: 'Test',
    slug: 'test',
    year: 2026,
    featuredOnIndex: false,
    indexOrder: null,
    coverPhotoId: null,
    photos: [
      {
        id: 'one',
        storagePath: 'shootings/id/one.jpg',
        shootingVisible: true,
        archiveVisible: false,
        altEn: null,
      },
    ],
  });

  assert.deepEqual(blockers, ['Add English alt text to every visible image.']);
});

test('treats an INDEX cover as publicly visible even when hidden elsewhere', () => {
  const blockers = getPublishBlockers({
    title: 'Test',
    slug: 'test',
    year: 2026,
    featuredOnIndex: true,
    indexOrder: 0,
    coverPhotoId: 'cover',
    photos: [
      {
        id: 'visible',
        storagePath: 'shootings/id/visible.jpg',
        shootingVisible: true,
        archiveVisible: false,
        altEn: 'Visible portrait',
      },
      {
        id: 'cover',
        storagePath: 'shootings/id/cover.jpg',
        shootingVisible: false,
        archiveVisible: false,
        altEn: '',
      },
    ],
  });

  assert.deepEqual(blockers, ['Add English alt text to every visible image.']);
});
