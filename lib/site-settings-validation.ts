import { z } from 'zod';
import { SITE_SETTINGS_ID } from './site-settings';
export { fieldErrorsFromZod } from './studio-validation';

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || null);

const optionalEmail = optionalText(320).refine(
  (value) => value === null || z.email().safeParse(value).success,
  'Enter a valid email address.',
);

const optionalHttpUrl = optionalText(2048).refine((value) => {
  if (value === null) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}, 'Enter a complete http:// or https:// URL.');

const base = {
  id: z.literal(SITE_SETTINGS_ID),
  revision: z.coerce.number().int().min(0),
};

export const publicProfileSettingsSchema = z.object({
  ...base,
  modelName: z.string().trim().min(1, 'Enter the public model name.').max(120),
  baseEn: optionalText(160),
  baseDe: optionalText(160),
  bioEn: optionalText(1500),
  bioDe: optionalText(1500),
  height: optionalText(60),
  bust: optionalText(60),
  waist: optionalText(60),
  hips: optionalText(60),
  shoeSize: optionalText(60),
  hairEn: optionalText(120),
  hairDe: optionalText(120),
  eyesEn: optionalText(120),
  eyesDe: optionalText(120),
  additionalDetailEn: optionalText(300),
  additionalDetailDe: optionalText(300),
  agencyName: optionalText(160),
  agencyLocationEn: optionalText(160),
  agencyLocationDe: optionalText(160),
  agencyUrl: optionalHttpUrl,
  agencyBookingEmail: optionalEmail,
  emphasizeAgency: z.boolean(),
  publicEmail: optionalEmail,
  contactLabelEn: optionalText(80),
  contactLabelDe: optionalText(80),
  additionalContactLabelEn: optionalText(80),
  additionalContactLabelDe: optionalText(80),
  additionalContactValue: optionalText(320),
  additionalContactUrl: optionalHttpUrl,
  emailClickable: z.boolean(),
  instagramHandle: optionalText(120),
  instagramUrl: optionalHttpUrl,
  instagramInFooter: z.boolean(),
  languagesEn: optionalText(500),
  languagesDe: optionalText(500),
  baseCitiesEn: optionalText(500),
  baseCitiesDe: optionalText(500),
  selectedClientsEn: optionalText(1200),
  selectedClientsDe: optionalText(1200),
});

export const portraitDetailsSchema = z.object({
  ...base,
  portraitAltEn: z
    .string()
    .trim()
    .min(1, 'English alt text is required.')
    .max(500),
  portraitAltDe: optionalText(500),
  portraitPhotographer: optionalText(160),
  portraitCredit: optionalText(300),
});

export const yearStatementSchema = z.object({
  ...base,
  yearStatementEn: optionalText(1000),
  yearStatementDe: optionalText(1000),
});

export const compCardSettingsSchema = z.object({
  ...base,
  compCardEnabled: z.boolean(),
  compCardUrl: optionalHttpUrl,
});

export const finalizeSiteMediaSchema = z.object({
  kind: z.enum(['portrait', 'comp-card']),
  revision: z.number().int().min(0),
  blobUrl: z.url(),
  originalFilename: z.string().trim().min(1).max(255),
  portraitAltEn: z.string().trim().min(1).max(500).optional(),
  portraitAltDe: optionalText(500).optional(),
  portraitPhotographer: optionalText(160).optional(),
  portraitCredit: optionalText(300).optional(),
});

export type PublicProfileSettingsInput = z.infer<
  typeof publicProfileSettingsSchema
>;
