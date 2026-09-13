import type { SiteSettingsRow } from '@/db/schema';
import type { LocalizedText } from './content';

export const SITE_SETTINGS_ID = 'primary';

export type PublicSiteSettings = {
  modelName: string;
  base?: LocalizedText;
  bio?: LocalizedText;
  height?: string;
  bust?: string;
  waist?: string;
  hips?: string;
  shoeSize?: string;
  hair?: LocalizedText;
  eyes?: LocalizedText;
  additionalDetail?: LocalizedText;
  agencyName?: string;
  agencyLocation?: LocalizedText;
  agencyUrl?: string;
  agencyBookingEmail?: string;
  emphasizeAgency: boolean;
  publicEmail?: string;
  contactLabel?: LocalizedText;
  additionalContactLabel?: LocalizedText;
  additionalContactValue?: string;
  additionalContactUrl?: string;
  emailClickable: boolean;
  instagramHandle?: string;
  instagramUrl?: string;
  instagramInFooter: boolean;
  languages?: LocalizedText;
  baseCities?: LocalizedText;
  selectedClients?: LocalizedText;
  portrait: {
    src: string;
    width: number;
    height: number;
    alt: LocalizedText;
    photographer?: string;
    credit?: string;
  };
  compCard: {
    enabled: boolean;
    url?: string;
    originalFilename?: string;
  };
  yearStatement: LocalizedText;
};

export type StudioSiteSettings = Omit<
  SiteSettingsRow,
  'createdAt' | 'updatedAt'
> & {
  createdAt: string;
  updatedAt: string;
};

export function localizedSetting(
  english: string | null,
  german: string | null,
): LocalizedText | undefined {
  if (!english && !german) return undefined;
  return {
    en: english ?? german ?? '',
    de: german ?? english ?? '',
  };
}
