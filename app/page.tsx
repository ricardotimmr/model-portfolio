import { IndexGallery } from '@/components/public/IndexGallery';
import { featuredShootings } from '@/lib/content';

export default function IndexPage() {
  return <IndexGallery shootings={featuredShootings} />;
}
