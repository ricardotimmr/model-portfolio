import type { Metadata } from 'next';
import { ProfilePageContent } from '@/components/public/ProfilePageContent';
import { getPublicSiteSettings } from '@/db/site-settings-queries';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicSiteSettings();
  return {
    title: 'Profile',
    description:
      settings.bio?.en ??
      `Profile and contact information for ${settings.modelName}.`,
  };
}

export default function ProfilePage() {
  return <ProfilePageContent />;
}
