import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createSiteMediaPathname,
  isSiteCompCardType,
  isSitePortraitType,
  siteMediaPrefix,
} from '../lib/site-media-core';
import { localizedSetting } from '../lib/site-settings';
import {
  compCardSettingsSchema,
  portraitDetailsSchema,
  publicProfileSettingsSchema,
} from '../lib/site-settings-validation';

const baseProfile = {
  id: 'primary',
  revision: 0,
  modelName: 'Zoe Schmidt',
  baseEn: '',
  baseDe: '',
  bioEn: '',
  bioDe: '',
  height: '',
  bust: '',
  waist: '',
  hips: '',
  shoeSize: '',
  hairEn: '',
  hairDe: '',
  eyesEn: '',
  eyesDe: '',
  additionalDetailEn: '',
  additionalDetailDe: '',
  agencyName: '',
  agencyLocationEn: '',
  agencyLocationDe: '',
  agencyUrl: '',
  agencyBookingEmail: '',
  emphasizeAgency: false,
  publicEmail: '',
  contactLabelEn: 'CONTACT',
  contactLabelDe: 'KONTAKT',
  additionalContactLabelEn: '',
  additionalContactLabelDe: '',
  additionalContactValue: '',
  additionalContactUrl: '',
  emailClickable: false,
  instagramHandle: '',
  instagramUrl: '',
  instagramInFooter: true,
  languagesEn: '',
  languagesDe: '',
  baseCitiesEn: '',
  baseCitiesDe: '',
  selectedClientsEn: '',
  selectedClientsDe: '',
};

test('profile settings trim display strings and convert empty optional values to null', () => {
  const result = publicProfileSettingsSchema.parse({
    ...baseProfile,
    modelName: '  Zoe Schmidt  ',
  });
  assert.equal(result.modelName, 'Zoe Schmidt');
  assert.equal(result.baseEn, null);
  assert.equal(result.agencyUrl, null);
});

test('site settings reject malformed public URLs and missing portrait alt text', () => {
  assert.equal(
    publicProfileSettingsSchema.safeParse({
      ...baseProfile,
      agencyUrl: 'javascript:alert(1)',
    }).success,
    false,
  );
  assert.equal(
    portraitDetailsSchema.safeParse({
      id: 'primary',
      revision: 0,
      portraitAltEn: '',
      portraitAltDe: '',
      portraitPhotographer: '',
      portraitCredit: '',
    }).success,
    false,
  );
  assert.equal(
    compCardSettingsSchema.safeParse({
      id: 'primary',
      revision: 0,
      compCardEnabled: true,
      compCardUrl: 'https://example.com/card.pdf',
    }).success,
    true,
  );
});

test('localized settings fall back safely and site media stays in owned prefixes', () => {
  assert.deepEqual(localizedSetting('English', null), {
    en: 'English',
    de: 'English',
  });
  assert.equal(
    createSiteMediaPathname('portrait', '../Zöe Portrait.JPG'),
    'site/profile/portrait/zoe-portrait.jpg',
  );
  assert.equal(siteMediaPrefix('comp-card'), 'site/profile/comp-card/');
  assert.equal(isSitePortraitType('image/webp'), true);
  assert.equal(isSitePortraitType('image/svg+xml'), false);
  assert.equal(isSiteCompCardType('application/pdf'), true);
});
