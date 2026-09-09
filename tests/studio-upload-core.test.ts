import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createStudioUploadPathname,
  isStudioImageType,
  sanitizeUploadFilename,
} from '../lib/studio-upload-core';

test('creates safe shooting-scoped upload paths', () => {
  assert.equal(
    createStudioUploadPathname('shooting-id', '../../Été Portrait 01.JPG'),
    'shootings/shooting-id/ete-portrait-01.jpg',
  );
});

test('allows only supported browser image types', () => {
  assert.equal(isStudioImageType('image/jpeg'), true);
  assert.equal(isStudioImageType('image/avif'), true);
  assert.equal(isStudioImageType('image/svg+xml'), false);
  assert.equal(isStudioImageType('application/pdf'), false);
});

test('sanitizes empty and hostile upload filenames', () => {
  assert.equal(sanitizeUploadFilename('🔥🔥.jpg'), 'image.jpg');
  assert.equal(sanitizeUploadFilename('folder\\My File.webp'), 'my-file.webp');
});
