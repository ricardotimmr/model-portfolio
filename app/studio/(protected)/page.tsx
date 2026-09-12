import Link from 'next/link';
import { ShootingList } from '@/components/studio/ShootingList';
import { StudioHeader } from '@/components/studio/StudioHeader';
import { getStudioShootingList } from '@/db/studio-queries';

export default async function StudioPage() {
  const shootings = await getStudioShootingList();

  return (
    <main id="main-content" className="studio-dashboard" tabIndex={-1}>
      <StudioHeader />
      <div className="studio-dashboard__actions">
        <Link className="studio-primary-link" href="/studio/shootings/new">
          New shooting
        </Link>
      </div>
      <ShootingList shootings={shootings} />
    </main>
  );
}
