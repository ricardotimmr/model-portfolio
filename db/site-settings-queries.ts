import 'server-only';

import { cache } from 'react';
import { eq } from 'drizzle-orm';
import { unstable_cache } from 'next/cache';
import { requireStudioAdmin } from '@/lib/auth-session';
import {
  localizedSetting,
  SITE_SETTINGS_ID,
  type PublicSiteSettings,
  type StudioSiteSettings,
} from '@/lib/site-settings';
import { db } from './index';
import { siteSettings, type SiteSettingsRow } from './schema';

const PUBLIC_CACHE_SECONDS = 60 * 60;

function requiredLocalizedSetting(
  english: string | null,
  german: string | null,
) {
  return localizedSetting(english, german) ?? { en: '', de: '' };
}

export function mapPublicSiteSettings(
  row: SiteSettingsRow,
): PublicSiteSettings {
  return {
    modelName: row.modelName,
    base: localizedSetting(row.baseEn, row.baseDe),
    bio: localizedSetting(row.bioEn, row.bioDe),
    height: row.height ?? undefined,
    bust: row.bust ?? undefined,
    waist: row.waist ?? undefined,
    hips: row.hips ?? undefined,
    shoeSize: row.shoeSize ?? undefined,
    hair: localizedSetting(row.hairEn, row.hairDe),
    eyes: localizedSetting(row.eyesEn, row.eyesDe),
    additionalDetail: localizedSetting(
      row.additionalDetailEn,
      row.additionalDetailDe,
    ),
    agencyName: row.agencyName ?? undefined,
    agencyLocation: localizedSetting(
      row.agencyLocationEn,
      row.agencyLocationDe,
    ),
    agencyUrl: row.agencyUrl ?? undefined,
    agencyBookingEmail: row.agencyBookingEmail ?? undefined,
    emphasizeAgency: row.emphasizeAgency,
    publicEmail: row.publicEmail ?? undefined,
    contactLabel: localizedSetting(row.contactLabelEn, row.contactLabelDe),
    additionalContactLabel: localizedSetting(
      row.additionalContactLabelEn,
      row.additionalContactLabelDe,
    ),
    additionalContactValue: row.additionalContactValue ?? undefined,
    additionalContactUrl: row.additionalContactUrl ?? undefined,
    emailClickable: row.emailClickable,
    instagramHandle: row.instagramHandle ?? undefined,
    instagramUrl: row.instagramUrl ?? undefined,
    instagramInFooter: row.instagramInFooter,
    languages: localizedSetting(row.languagesEn, row.languagesDe),
    baseCities: localizedSetting(row.baseCitiesEn, row.baseCitiesDe),
    selectedClients: localizedSetting(
      row.selectedClientsEn,
      row.selectedClientsDe,
    ),
    portrait: {
      src: row.portraitUrl,
      width: row.portraitWidth,
      height: row.portraitHeight,
      alt: requiredLocalizedSetting(row.portraitAltEn, row.portraitAltDe),
      photographer: row.portraitPhotographer ?? undefined,
      credit: row.portraitCredit ?? undefined,
    },
    compCard: {
      enabled: row.compCardEnabled,
      url: row.compCardUrl ?? undefined,
      originalFilename: row.compCardOriginalFilename ?? undefined,
    },
    yearStatement: requiredLocalizedSetting(
      row.yearStatementEn,
      row.yearStatementDe,
    ),
  };
}

async function readSettingsRow() {
  const [row] = await db
    .select()
    .from(siteSettings)
    .where(eq(siteSettings.id, SITE_SETTINGS_ID))
    .limit(1);

  if (!row) {
    throw new Error(
      'The primary site settings row is missing. Run the database migration.',
    );
  }
  return row;
}

const readPublicSiteSettings = unstable_cache(
  async () => mapPublicSiteSettings(await readSettingsRow()),
  ['public-site-settings-v1'],
  {
    revalidate: PUBLIC_CACHE_SECONDS,
    tags: ['site-settings', 'profile'],
  },
);

export const getPublicSiteSettings = cache(readPublicSiteSettings);

export async function getStudioSiteSettings(): Promise<StudioSiteSettings> {
  await requireStudioAdmin();
  const row = await readSettingsRow();
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
