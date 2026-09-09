import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeAdminEmail, validateAdminEmail } from '../lib/admin-email';

test('normalizes the Studio administrator email', () => {
  assert.equal(
    normalizeAdminEmail('  Ricardo.Timmr@Gmail.com '),
    'ricardo.timmr@gmail.com',
  );
});

test('accepts a valid administrator email', () => {
  assert.equal(
    validateAdminEmail('ricardo.timmr@gmail.com'),
    'ricardo.timmr@gmail.com',
  );
});

test('rejects invalid administrator emails', () => {
  assert.throws(() => validateAdminEmail('not-an-email'));
  assert.throws(() => validateAdminEmail('a@b'));
});
