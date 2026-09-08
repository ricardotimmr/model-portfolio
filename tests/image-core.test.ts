import assert from 'node:assert/strict';
import { test } from 'node:test';
import sharp from 'sharp';
import {
  createMigrationBlobPathname,
  inspectImageBuffer,
  MAX_IMAGE_FILE_SIZE,
  sanitizeFilename,
} from '../lib/image-core';
import { assertPhotoDeletionAllowed } from '../lib/photo-asset-core';

test('inspects a real image payload and derives display metadata', async () => {
  const image = await sharp({
    create: {
      width: 120,
      height: 80,
      channels: 3,
      background: '#ffffff',
    },
  })
    .jpeg()
    .toBuffer();

  const metadata = await inspectImageBuffer(image);

  assert.equal(metadata.contentType, 'image/jpeg');
  assert.equal(metadata.extension, 'jpg');
  assert.equal(metadata.width, 120);
  assert.equal(metadata.height, 80);
  assert.equal(metadata.orientation, 'landscape');
  assert.equal(metadata.fileSize, image.length);
});

test('rejects content that is not a readable image', async () => {
  await assert.rejects(
    inspectImageBuffer(Buffer.from('not an image')),
    /not a readable image/,
  );
});

test('rejects an image before decoding when it exceeds the size limit', async () => {
  await assert.rejects(
    inspectImageBuffer(Buffer.alloc(MAX_IMAGE_FILE_SIZE + 1)),
    /exceeds the 25 MB upload limit/,
  );
});

test('creates sanitized deterministic migration paths', () => {
  assert.equal(
    sanitizeFilename('../../Mödel Portrait 01.JPG'),
    'model-portrait-01',
  );
  assert.equal(
    createMigrationBlobPathname('Studio Portraits', 'photo-id', 'jpg'),
    'shootings/studio-portraits/photo-id.jpg',
  );
});

test('rejects deletion of the active cover for an INDEX shooting', () => {
  assert.throws(
    () =>
      assertPhotoDeletionAllowed({
        photoId: 'photo-id',
        coverPhotoId: 'photo-id',
        featuredOnIndex: true,
      }),
    /replacement cover/,
  );

  assert.doesNotThrow(() =>
    assertPhotoDeletionAllowed({
      photoId: 'another-photo-id',
      coverPhotoId: 'photo-id',
      featuredOnIndex: true,
    }),
  );
});
