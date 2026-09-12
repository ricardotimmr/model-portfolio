import type { Metadata } from 'next';
import { ProfilePageContent } from '@/components/public/ProfilePageContent';
import { getPublishedProfilePortrait } from '@/db/queries';
import { profile } from '@/lib/content';

export const metadata: Metadata = {
  title: 'Profile',
  description: 'Profile and contact information for model Zoe Schmidt.',
};

export default async function ProfilePage() {
  const portrait = await getPublishedProfilePortrait();

  return <ProfilePageContent portrait={portrait ?? profile.portrait} />;
}
