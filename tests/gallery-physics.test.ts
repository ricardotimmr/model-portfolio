import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  getSafeParallaxShift,
  normalizeWheelDeltaToPixels,
} from '../lib/gallery-physics';

test('normalizes wheel input without changing pixel deltas', () => {
  assert.equal(normalizeWheelDeltaToPixels(12, 0, 900), 12);
  assert.equal(normalizeWheelDeltaToPixels(3, 1, 900), 48);
  assert.equal(normalizeWheelDeltaToPixels(1, 2, 900), 900);
});

test('keeps parallax inside the image overflow at every card width', () => {
  assert.equal(getSafeParallaxShift(440, 1.5, 112), 109);
  assert.equal(getSafeParallaxShift(300, 1.5, 112), 74);
  assert.equal(getSafeParallaxShift(600, 1.5, 112), 112);
});

test('disables unsafe parallax geometry', () => {
  assert.equal(getSafeParallaxShift(0, 1.5, 112), 0);
  assert.equal(getSafeParallaxShift(440, 1, 112), 0);
  assert.equal(getSafeParallaxShift(440, Number.NaN, 112), 0);
});
