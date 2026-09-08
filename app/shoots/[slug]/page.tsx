import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ShootingEditorial } from '@/components/public/ShootingEditorial';
import {
  getPublishedShootingBySlug,
  getPublishedShootingNavigation,
  getPublishedShootingSlugs,
} from '@/db/queries';
import { getCover } from '@/lib/content';

type ShootingPageProps = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const slugs = await getPublishedShootingSlugs();

  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: ShootingPageProps): Promise<Metadata> {
  const shooting = await getPublishedShootingBySlug((await params).slug);
  if (!shooting) return {};
  const cover = getCover(shooting);
  return {
    title: shooting.title,
    description:
      shooting.description?.en ??
      `${shooting.title}, ${shooting.year} — Zoe Schmidt portfolio series.`,
    openGraph: cover
      ? {
          images: [
            { url: cover.src, width: cover.width, height: cover.height },
          ],
        }
      : undefined,
  };
}

export default async function ShootingPage({ params }: ShootingPageProps) {
  const shooting = await getPublishedShootingBySlug((await params).slug);
  if (!shooting) notFound();

  const navigation = await getPublishedShootingNavigation();
  const currentIndex = navigation.findIndex(
    (item) => item.slug === shooting.slug,
  );
  if (currentIndex === -1) notFound();

  const previous =
    navigation[(currentIndex - 1 + navigation.length) % navigation.length]!;
  const next = navigation[(currentIndex + 1) % navigation.length]!;

  return (
    <ShootingEditorial shooting={shooting} previous={previous} next={next} />
  );
}
