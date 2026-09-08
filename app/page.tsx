import { IndexGallery } from '@/components/public/IndexGallery';
import { IndexEmptyState } from '@/components/public/IndexEmptyState';
import { getPublishedIndexShootings } from '@/db/queries';

export default async function IndexPage() {
  const shootings = await getPublishedIndexShootings();

  if (shootings.length === 0) return <IndexEmptyState />;

  return <IndexGallery shootings={shootings} />;
}
