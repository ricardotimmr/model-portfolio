import { redirect } from 'next/navigation';
import Link from 'next/link';
import { StudioLoginForm } from '@/components/studio/StudioLoginForm';
import { getStudioSession } from '@/lib/auth-session';

export const dynamic = 'force-dynamic';

export default async function StudioLoginPage() {
  const session = await getStudioSession();
  if (session) redirect('/studio');

  return (
    <main id="main-content" className="studio-login" tabIndex={-1}>
      <section className="studio-login__panel" aria-labelledby="studio-title">
        <p className="studio-kicker">ZOE SCHMIDT / PRIVATE</p>
        <h1 id="studio-title">Studio</h1>
        <p className="studio-login__intro">
          Sign in to manage portfolio content.
        </p>
        <StudioLoginForm />
        <Link className="studio-back-link" href="/">
          Return to portfolio
        </Link>
      </section>
    </main>
  );
}
