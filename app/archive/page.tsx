import type { Metadata } from 'next';
import { ArchivePageContent } from '@/components/public/ArchivePageContent';
import { getPublishedArchive } from '@/db/queries';
import { getPublicSiteSettings } from '@/db/site-settings-queries';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicSiteSettings();
  return {
    title: 'Lookbook',
    description: `Selected photographs from ${settings.modelName}’s published series.`,
  };
}

export default async function ArchivePage() {
  const items = await getPublishedArchive();

  return <ArchivePageContent items={items} />;
}
