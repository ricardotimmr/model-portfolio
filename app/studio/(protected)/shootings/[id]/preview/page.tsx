import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ShootingEditorial } from '@/components/public/ShootingEditorial';
import { getStudioShootingPreview } from '@/db/studio-queries';
import { toPreviewShooting } from '@/lib/studio-preview';

type StudioPreviewPageProps = { params: Promise<{ id: string }> };

export default async function StudioPreviewPage({
  params,
}: StudioPreviewPageProps) {
  const shooting = await getStudioShootingPreview((await params).id);
  if (!shooting) notFound();

  return (
    <>
      <aside className="studio-preview-bar" aria-label="Studio preview">
        <div>
          <span className="studio-status" data-status={shooting.status}>
            {shooting.status === 'published' ? 'Live' : shooting.status}
          </span>
          <span>Saved preview</span>
        </div>
        <div>
          {shooting.status === 'published' ? (
            <Link href={`/shoots/${shooting.slug}`}>Open public page</Link>
          ) : null}
          <Link href={`/studio/shootings/${shooting.id}`}>Back to editor</Link>
        </div>
      </aside>
      <ShootingEditorial shooting={toPreviewShooting(shooting)} studioPreview />
    </>
  );
}
