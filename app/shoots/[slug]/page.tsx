import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ShootingEditorial } from '@/components/public/ShootingEditorial';
import { getCover, getShooting, shootings } from '@/lib/content';

type ShootingPageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return shootings.map((shooting) => ({ slug: shooting.slug }));
}

export async function generateMetadata({
  params,
}: ShootingPageProps): Promise<Metadata> {
  const shooting = getShooting((await params).slug);
  if (!shooting) return {};
  const cover = getCover(shooting);
  return {
    title: shooting.title,
    description: `${shooting.title}, ${shooting.year} — Zoe Schmidt portfolio series.`,
    openGraph: {
      images: [{ url: cover.src, width: cover.width, height: cover.height }],
    },
  };
}

export default async function ShootingPage({ params }: ShootingPageProps) {
  const shooting = getShooting((await params).slug);
  if (!shooting) notFound();
  const currentIndex = shootings.findIndex((item) => item.id === shooting.id);
  const previous =
    shootings[(currentIndex - 1 + shootings.length) % shootings.length]!;
  const next = shootings[(currentIndex + 1) % shootings.length]!;

  return (
    <ShootingEditorial shooting={shooting} previous={previous} next={next} />
  );
}
