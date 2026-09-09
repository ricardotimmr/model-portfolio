import 'server-only';

import { revalidatePath, revalidateTag } from 'next/cache';

const publicTags = ['shootings', 'photos', 'index', 'archive'] as const;

export function invalidatePublicPortfolio({
  oldSlug,
  slug,
  profile = false,
}: {
  oldSlug?: string | null;
  slug?: string | null;
  profile?: boolean;
} = {}) {
  for (const tag of publicTags) revalidateTag(tag, { expire: 0 });
  if (profile) revalidateTag('profile', { expire: 0 });

  revalidatePath('/');
  revalidatePath('/archive');
  if (oldSlug) revalidatePath(`/shoots/${oldSlug}`);
  if (slug && slug !== oldSlug) revalidatePath(`/shoots/${slug}`);
}
