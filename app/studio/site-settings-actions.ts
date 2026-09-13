'use server';

import { refresh } from 'next/cache';
import {
  finalizeSiteMedia,
  removeCompCardAsset,
  updateCompCardSettings,
  updatePortraitDetails,
  updatePublicProfileSettings,
  updateYearStatement,
} from '@/db/site-settings-mutations';
import type { StudioActionState } from '@/lib/studio-action-state';
import { StudioExpectedError } from '@/lib/studio-errors';
import {
  compCardSettingsSchema,
  fieldErrorsFromZod,
  portraitDetailsSchema,
  publicProfileSettingsSchema,
  yearStatementSchema,
} from '@/lib/site-settings-validation';

function value(formData: FormData, name: string) {
  return String(formData.get(name) ?? '');
}

function checked(formData: FormData, name: string) {
  return formData.get(name) === 'on';
}

async function formMutation(
  parsed: ReturnType<
    | typeof publicProfileSettingsSchema.safeParse
    | typeof portraitDetailsSchema.safeParse
    | typeof yearStatementSchema.safeParse
    | typeof compCardSettingsSchema.safeParse
  >,
  mutation: (data: never) => Promise<{ revision: number; warning?: string }>,
  successMessage: string,
): Promise<StudioActionState> {
  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Check the highlighted fields.',
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }
  try {
    const result = await mutation(parsed.data as never);
    refresh();
    return {
      status: 'success',
      message: result.warning ?? successMessage,
      revision: result.revision,
    };
  } catch (error) {
    if (error instanceof StudioExpectedError) {
      return {
        status: 'error',
        message: error.message,
        fieldErrors: error.fieldErrors,
        revision:
          'revision' in parsed.data ? Number(parsed.data.revision) : undefined,
      };
    }
    throw error;
  }
}

export async function updatePublicProfileAction(
  _previous: StudioActionState,
  formData: FormData,
) {
  const input = Object.fromEntries(
    [
      'id',
      'revision',
      'modelName',
      'baseEn',
      'baseDe',
      'bioEn',
      'bioDe',
      'height',
      'bust',
      'waist',
      'hips',
      'shoeSize',
      'hairEn',
      'hairDe',
      'eyesEn',
      'eyesDe',
      'additionalDetailEn',
      'additionalDetailDe',
      'agencyName',
      'agencyLocationEn',
      'agencyLocationDe',
      'agencyUrl',
      'agencyBookingEmail',
      'publicEmail',
      'contactLabelEn',
      'contactLabelDe',
      'additionalContactLabelEn',
      'additionalContactLabelDe',
      'additionalContactValue',
      'additionalContactUrl',
      'instagramHandle',
      'instagramUrl',
      'languagesEn',
      'languagesDe',
      'baseCitiesEn',
      'baseCitiesDe',
      'selectedClientsEn',
      'selectedClientsDe',
    ].map((name) => [name, value(formData, name)]),
  );
  Object.assign(input, {
    emphasizeAgency: checked(formData, 'emphasizeAgency'),
    emailClickable: checked(formData, 'emailClickable'),
    instagramInFooter: checked(formData, 'instagramInFooter'),
  });
  return formMutation(
    publicProfileSettingsSchema.safeParse(input),
    updatePublicProfileSettings,
    'Profile settings saved.',
  );
}

export async function updatePortraitDetailsAction(
  _previous: StudioActionState,
  formData: FormData,
) {
  const input = Object.fromEntries(
    [
      'id',
      'revision',
      'portraitAltEn',
      'portraitAltDe',
      'portraitPhotographer',
      'portraitCredit',
    ].map((name) => [name, value(formData, name)]),
  );
  return formMutation(
    portraitDetailsSchema.safeParse(input),
    updatePortraitDetails,
    'Portrait details saved.',
  );
}

export async function updateYearStatementAction(
  _previous: StudioActionState,
  formData: FormData,
) {
  const input = Object.fromEntries(
    ['id', 'revision', 'yearStatementEn', 'yearStatementDe'].map((name) => [
      name,
      value(formData, name),
    ]),
  );
  return formMutation(
    yearStatementSchema.safeParse(input),
    updateYearStatement,
    'Year statement saved.',
  );
}

export async function updateCompCardAction(
  _previous: StudioActionState,
  formData: FormData,
) {
  const input = {
    id: value(formData, 'id'),
    revision: value(formData, 'revision'),
    compCardEnabled: checked(formData, 'compCardEnabled'),
    compCardUrl: value(formData, 'compCardUrl'),
  };
  return formMutation(
    compCardSettingsSchema.safeParse(input),
    updateCompCardSettings,
    'Comp Card settings saved.',
  );
}

export type SiteMediaMutationResult = {
  ok: boolean;
  message: string;
  revision?: number;
};

export async function finalizeSiteMediaAction(
  input: unknown,
): Promise<SiteMediaMutationResult> {
  try {
    const result = await finalizeSiteMedia(input);
    refresh();
    return {
      ok: true,
      message: result.warning ?? 'Upload complete.',
      revision: result.revision,
    };
  } catch (error) {
    if (error instanceof StudioExpectedError)
      return { ok: false, message: error.message };
    return { ok: false, message: 'The uploaded file could not be finalized.' };
  }
}

export async function removeCompCardAction(
  input: unknown,
): Promise<SiteMediaMutationResult> {
  try {
    const result = await removeCompCardAsset(input);
    refresh();
    return {
      ok: true,
      message: result.warning ?? 'Comp Card removed.',
      revision: result.revision,
    };
  } catch (error) {
    if (error instanceof StudioExpectedError)
      return { ok: false, message: error.message };
    return { ok: false, message: 'The Comp Card could not be removed.' };
  }
}
