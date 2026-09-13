import Link from 'next/link';
import { SiteSettingsEditor } from '@/components/studio/SiteSettingsEditor';
import { StudioHeader } from '@/components/studio/StudioHeader';
import { getStudioSiteSettings } from '@/db/site-settings-queries';

export default async function SiteSettingsPage() {
  const settings = await getStudioSiteSettings();
  return (
    <main id="main-content" className="studio-editor" tabIndex={-1}>
      <StudioHeader
        title="Profile & site settings"
        backHref="/studio"
        backLabel="Back to Studio"
      />
      <p className="studio-settings-intro">
        These values are public after saving. Empty optional fields stay hidden.
      </p>
      <Link className="studio-back-link" href="/profile" target="_blank">
        Open public PROFILE preview
      </Link>
      <SiteSettingsEditor key={settings.revision} settings={settings} />
    </main>
  );
}
