import { ArchivePageContent } from '@/components/public/ArchivePageContent';
import { getPublishedArchive } from '@/db/queries';

export default async function ArchivePage() {
  const items = await getPublishedArchive();

  return <ArchivePageContent items={items} />;
}
