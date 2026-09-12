import type { Metadata } from 'next';
import { ArchivePageContent } from '@/components/public/ArchivePageContent';
import { getPublishedArchive } from '@/db/queries';

export const metadata: Metadata = {
  title: 'Lookbook',
  description: 'Selected photographs from Zoe Schmidt’s published series.',
};

export default async function ArchivePage() {
  const items = await getPublishedArchive();

  return <ArchivePageContent items={items} />;
}
