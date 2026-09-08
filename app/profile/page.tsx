import { ProfilePageContent } from '@/components/public/ProfilePageContent';
import { getPublishedProfilePortrait } from '@/db/queries';
import { profile } from '@/lib/content';

export default async function ProfilePage() {
  const portrait = await getPublishedProfilePortrait();

  return <ProfilePageContent portrait={portrait ?? profile.portrait} />;
}
