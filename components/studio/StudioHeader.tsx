import Link from 'next/link';
import { signOutOfStudio } from '@/app/studio/actions';

export function StudioHeader({
  eyebrow = 'ZOE SCHMIDT / PRIVATE',
  title = 'Studio',
  backHref,
  backLabel,
}: {
  eyebrow?: string;
  title?: string;
  backHref?: '/studio' | `/studio/shootings/${string}`;
  backLabel?: string;
}) {
  return (
    <header className="studio-header">
      <div>
        {backHref && backLabel ? (
          <Link
            className="studio-back-link studio-back-link--header"
            href={backHref}
          >
            {backLabel}
          </Link>
        ) : null}
        <p className="studio-kicker">{eyebrow}</p>
        <h1>{title}</h1>
      </div>
      <form action={signOutOfStudio}>
        <button className="studio-text-button" type="submit">
          Sign out
        </button>
      </form>
    </header>
  );
}
