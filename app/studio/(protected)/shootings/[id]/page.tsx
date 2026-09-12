import { notFound } from 'next/navigation';
import { PhotoWorkspace } from '@/components/studio/PhotoWorkspace';
import { ShootingForm } from '@/components/studio/ShootingForm';
import { StudioHeader } from '@/components/studio/StudioHeader';
import { UploadQueue } from '@/components/studio/UploadQueue';
import { getStudioShootingById } from '@/db/studio-queries';

type StudioShootingPageProps = { params: Promise<{ id: string }> };

export default async function StudioShootingPage({
  params,
}: StudioShootingPageProps) {
  const shooting = await getStudioShootingById((await params).id);
  if (!shooting) notFound();

  return (
    <main id="main-content" className="studio-editor" tabIndex={-1}>
      <StudioHeader
        eyebrow={`STUDIO / ${shooting.status.toUpperCase()}`}
        title={shooting.title}
        backHref="/studio"
        backLabel="Back to dashboard"
      />
      <ShootingForm shooting={shooting} />
      <UploadQueue shootingId={shooting.id} />
      <PhotoWorkspace key={shooting.revision} shooting={shooting} />
    </main>
  );
}
