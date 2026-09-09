import { z } from 'zod';
import { isCanonicalSlug } from './slug';

export const shootingStatuses = ['draft', 'published', 'archived'] as const;
export type ShootingStatus = (typeof shootingStatuses)[number];

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || null);

function isValidDate(value: string) {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value
  );
}

export const shootingMetadataSchema = z.object({
  id: z.uuid(),
  revision: z.coerce.number().int().min(0),
  title: z.string().trim().min(1, 'Enter a title.').max(120),
  slug: z
    .string()
    .trim()
    .min(1, 'Enter a slug.')
    .max(80)
    .refine(isCanonicalSlug, 'Use lowercase letters, numbers, and hyphens.'),
  shootDate: z
    .string()
    .trim()
    .refine(isValidDate, 'Enter a valid date.')
    .transform((value) => value || null),
  year: z.coerce.number().int().min(1900).max(2100),
  locationEn: optionalText(160),
  locationDe: optionalText(160),
  descriptionEn: optionalText(1200),
  descriptionDe: optionalText(1200),
  photographer: optionalText(160),
  styling: optionalText(160),
  makeup: optionalText(160),
  hair: optionalText(160),
  client: optionalText(160),
  credits: optionalText(1000),
});

export type ShootingMetadataInput = z.infer<typeof shootingMetadataSchema>;

export const createShootingSchema = shootingMetadataSchema.pick({
  title: true,
  slug: true,
  shootDate: true,
  year: true,
});

export const photoDetailsSchema = z.object({
  id: z.uuid(),
  altEn: optionalText(500),
  altDe: optionalText(500),
  captionEn: optionalText(1000),
  captionDe: optionalText(1000),
  archiveVisible: z.boolean(),
  shootingVisible: z.boolean(),
  layoutHint: z.enum([
    'auto',
    'full',
    'wide',
    'medium',
    'left',
    'right',
    'pair-next',
  ]),
});

export const photoDetailsBatchSchema = z.object({
  shootingId: z.uuid(),
  revision: z.number().int().min(0),
  photos: z.array(photoDetailsSchema).max(200),
});

export const photoOrderSchema = z.object({
  shootingId: z.uuid(),
  revision: z.number().int().min(0),
  photoIds: z.array(z.uuid()).min(1).max(200),
});

export const shootingPresentationSchema = z.object({
  shootingId: z.uuid(),
  revision: z.number().int().min(0),
  coverPhotoId: z.uuid().nullable(),
  featuredOnIndex: z.boolean(),
  indexOrder: z.number().int().min(0).nullable(),
});

export const shootingTransitionSchema = z.object({
  shootingId: z.uuid(),
  revision: z.number().int().min(0),
  to: z.enum(shootingStatuses),
});

export const deleteShootingSchema = z.object({
  shootingId: z.uuid(),
  revision: z.number().int().min(0),
  confirmation: z.string(),
});

export function validateExactPhotoOrder(
  submittedIds: string[],
  storedIds: string[],
) {
  if (
    submittedIds.length !== storedIds.length ||
    new Set(submittedIds).size !== submittedIds.length
  ) {
    return false;
  }

  const stored = new Set(storedIds);
  return submittedIds.every((id) => stored.has(id));
}

export function canTransitionShooting(
  from: ShootingStatus,
  to: ShootingStatus,
) {
  if (from === to) return false;
  if (from === 'draft') return to === 'published' || to === 'archived';
  if (from === 'published') return to === 'draft' || to === 'archived';
  return to === 'draft';
}

export type PublishCandidate = {
  title: string;
  slug: string;
  year: number;
  featuredOnIndex: boolean;
  indexOrder: number | null;
  coverPhotoId: string | null;
  photos: Array<{
    id: string;
    storagePath: string | null;
    shootingVisible: boolean;
    archiveVisible: boolean;
    altEn: string | null;
  }>;
};

export function getPublishBlockers(candidate: PublishCandidate) {
  const blockers: string[] = [];
  const finalized = candidate.photos.filter((photo) => photo.storagePath);
  const publiclyVisible = candidate.photos.filter(
    (photo) =>
      photo.shootingVisible ||
      photo.archiveVisible ||
      (candidate.featuredOnIndex && photo.id === candidate.coverPhotoId),
  );

  if (!candidate.title.trim()) blockers.push('Enter a title.');
  if (!isCanonicalSlug(candidate.slug)) blockers.push('Enter a valid slug.');
  if (candidate.year < 1900 || candidate.year > 2100) {
    blockers.push('Enter a valid year.');
  }
  if (finalized.length === 0) blockers.push('Upload at least one image.');
  if (!candidate.photos.some((photo) => photo.shootingVisible)) {
    blockers.push('Show at least one image on the shooting page.');
  }
  if (publiclyVisible.some((photo) => !photo.altEn?.trim())) {
    blockers.push('Add English alt text to every visible image.');
  }

  if (candidate.featuredOnIndex) {
    const cover = candidate.photos.find(
      (photo) => photo.id === candidate.coverPhotoId,
    );
    if (!cover?.storagePath) blockers.push('Select a finalized cover image.');
    if (candidate.indexOrder === null || candidate.indexOrder < 0) {
      blockers.push('Set a valid INDEX order.');
    }
  }

  return blockers;
}

export function fieldErrorsFromZod(error: z.ZodError) {
  const fieldErrors: Record<string, string> = {};

  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field === 'string' && !fieldErrors[field]) {
      fieldErrors[field] = issue.message;
    }
  }

  return fieldErrors;
}
