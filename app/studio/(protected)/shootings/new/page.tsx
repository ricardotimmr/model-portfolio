import { NewShootingForm } from '@/components/studio/NewShootingForm';
import { StudioHeader } from '@/components/studio/StudioHeader';

export default function NewShootingPage() {
  return (
    <main id="main-content" className="studio-editor" tabIndex={-1}>
      <StudioHeader
        eyebrow="STUDIO / NEW SHOOTING"
        title="New shooting"
        backHref="/studio"
        backLabel="Back to dashboard"
      />
      <NewShootingForm />
    </main>
  );
}
