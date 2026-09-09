'use server';

import { redirect } from 'next/navigation';
import { refresh } from 'next/cache';
import {
  deleteStoredPhotoAsset,
  finalizeUploadedPhotoAsset,
} from '@/db/photo-assets';
import {
  createStudioShooting,
  deleteStudioShooting,
  reorderStudioPhotos,
  transitionStudioShooting,
  updateStudioPhotoDetails,
  updateStudioPresentation,
  updateStudioShootingMetadata,
} from '@/db/studio-mutations';
import type { StudioActionState } from '@/lib/studio-action-state';
import { StudioExpectedError } from '@/lib/studio-errors';
import {
  createShootingSchema,
  fieldErrorsFromZod,
  shootingMetadataSchema,
} from '@/lib/studio-validation';
import { z } from 'zod';

function stringValue(formData: FormData, name: string) {
  return String(formData.get(name) ?? '');
}

function metadataFromForm(formData: FormData) {
  return {
    id: stringValue(formData, 'id'),
    revision: stringValue(formData, 'revision'),
    title: stringValue(formData, 'title'),
    slug: stringValue(formData, 'slug'),
    shootDate: stringValue(formData, 'shootDate'),
    year: stringValue(formData, 'year'),
    locationEn: stringValue(formData, 'locationEn'),
    locationDe: stringValue(formData, 'locationDe'),
    descriptionEn: stringValue(formData, 'descriptionEn'),
    descriptionDe: stringValue(formData, 'descriptionDe'),
    photographer: stringValue(formData, 'photographer'),
    styling: stringValue(formData, 'styling'),
    makeup: stringValue(formData, 'makeup'),
    hair: stringValue(formData, 'hair'),
    client: stringValue(formData, 'client'),
    credits: stringValue(formData, 'credits'),
  };
}

export async function createShootingAction(
  _previous: StudioActionState,
  formData: FormData,
): Promise<StudioActionState> {
  const input = {
    title: stringValue(formData, 'title'),
    slug: stringValue(formData, 'slug'),
    shootDate: stringValue(formData, 'shootDate'),
    year: stringValue(formData, 'year'),
  };
  const parsed = createShootingSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Check the highlighted fields.',
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }

  let created: Awaited<ReturnType<typeof createStudioShooting>>;
  try {
    created = await createStudioShooting(parsed.data);
  } catch (error) {
    if (error instanceof StudioExpectedError) {
      return {
        status: 'error',
        message: error.message,
        fieldErrors: error.fieldErrors,
      };
    }
    throw error;
  }

  redirect(`/studio/shootings/${created.id}`);
}

export async function updateShootingMetadataAction(
  previous: StudioActionState,
  formData: FormData,
): Promise<StudioActionState> {
  const input = metadataFromForm(formData);
  const parsed = shootingMetadataSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Check the highlighted fields.',
      fieldErrors: fieldErrorsFromZod(parsed.error),
      revision: previous.revision,
    };
  }

  try {
    const updated = await updateStudioShootingMetadata(parsed.data);
    refresh();
    return {
      status: 'success',
      message: 'Metadata saved.',
      revision: updated.revision,
    };
  } catch (error) {
    if (error instanceof StudioExpectedError) {
      return {
        status: 'error',
        message: error.message,
        fieldErrors: error.fieldErrors,
        revision: parsed.data.revision,
      };
    }
    throw error;
  }
}

const finalizeUploadSchema = z.object({
  shootingId: z.uuid(),
  blobUrl: z.url(),
  originalFilename: z.string().trim().min(1).max(255),
});

export async function finalizePhotoUploadAction(input: unknown): Promise<{
  ok: boolean;
  message: string;
  revision?: number;
}> {
  const parsed = finalizeUploadSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: 'The uploaded photo details are invalid.' };
  }

  try {
    const photo = await finalizeUploadedPhotoAsset(parsed.data);
    return {
      ok: true,
      message: 'Upload complete.',
      revision: photo.revision,
    };
  } catch (error) {
    if (error instanceof StudioExpectedError) {
      return { ok: false, message: error.message };
    }
    return {
      ok: false,
      message: 'The uploaded photo could not be finalized. Try again.',
    };
  }
}

export type StudioMutationResult = {
  ok: boolean;
  message: string;
  revision?: number;
  status?: 'draft' | 'published' | 'archived';
  deleted?: boolean;
};

async function mutationResult(
  mutation: () => Promise<
    | {
        revision: number;
        status?: 'draft' | 'published' | 'archived';
        warning?: string;
      }
    | { deleted: true; warning?: string }
  >,
  successMessage: string,
): Promise<StudioMutationResult> {
  try {
    const result = await mutation();
    refresh();
    const { warning, ...data } = result;
    return { ok: true, message: warning ?? successMessage, ...data };
  } catch (error) {
    if (error instanceof StudioExpectedError) {
      return { ok: false, message: error.message };
    }
    return { ok: false, message: 'The action failed. Try again.' };
  }
}

export async function savePhotoDetailsAction(
  input: unknown,
): Promise<StudioMutationResult> {
  return mutationResult(
    () => updateStudioPhotoDetails(input),
    'Photo details saved.',
  );
}

export async function reorderPhotosAction(
  input: unknown,
): Promise<StudioMutationResult> {
  return mutationResult(() => reorderStudioPhotos(input), 'Photo order saved.');
}

export async function savePresentationAction(
  input: unknown,
): Promise<StudioMutationResult> {
  return mutationResult(
    () => updateStudioPresentation(input),
    'Cover and INDEX settings saved.',
  );
}

export async function transitionShootingAction(
  input: unknown,
): Promise<StudioMutationResult> {
  return mutationResult(
    () => transitionStudioShooting(input),
    'Shooting status updated.',
  );
}

const deletePhotoSchema = z.object({
  photoId: z.uuid(),
  shootingId: z.uuid(),
  revision: z.number().int().min(0),
});

export async function deletePhotoAction(
  input: unknown,
): Promise<StudioMutationResult> {
  const parsed = deletePhotoSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: 'The photo deletion request is invalid.' };
  }
  return mutationResult(
    () => deleteStoredPhotoAsset(parsed.data),
    'Photo permanently deleted.',
  );
}

export async function deleteShootingAction(
  input: unknown,
): Promise<StudioMutationResult> {
  return mutationResult(
    () => deleteStudioShooting(input),
    'Shooting permanently deleted.',
  );
}
