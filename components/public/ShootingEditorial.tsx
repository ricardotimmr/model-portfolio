'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Fragment } from 'react';
import { Footer } from '@/components/public/Footer';
import { useLanguage } from '@/components/providers/LanguageProvider';
import type {
  PortfolioPhoto,
  Shooting,
  ShootingNavigationItem,
} from '@/lib/content';
import { localize, messages } from '@/lib/i18n';

type ShootingEditorialProps = {
  shooting: Shooting;
  previous: ShootingNavigationItem;
  next: ShootingNavigationItem;
};

type EditorialRow = {
  kind: 'hero' | 'pair' | 'wide' | 'single-left' | 'single-right';
  photos: PortfolioPhoto[];
};

function buildEditorialRows(shooting: Shooting) {
  const photos = shooting.photos.filter((photo) => photo.shootingVisible);
  const rows: EditorialRow[] = [];
  if (photos[0]) rows.push({ kind: 'hero', photos: [photos[0]] });

  let portraitSide = 0;
  for (let index = 1; index < photos.length; index += 1) {
    const current = photos[index];
    const next = photos[index + 1];
    if (
      current.orientation === 'portrait' &&
      next?.orientation === 'portrait'
    ) {
      rows.push({ kind: 'pair', photos: [current, next] });
      index += 1;
    } else if (current.orientation === 'landscape') {
      rows.push({ kind: 'wide', photos: [current] });
    } else {
      rows.push({
        kind: portraitSide++ % 2 === 0 ? 'single-left' : 'single-right',
        photos: [current],
      });
    }
  }
  return rows;
}

export function ShootingEditorial({
  shooting,
  previous,
  next,
}: ShootingEditorialProps) {
  const { language } = useLanguage();
  const rows = buildEditorialRows(shooting);

  return (
    <main id="main-content" className="page-shell shooting-page">
      <header className="shooting-header">
        <p className="eyebrow">Series / {shooting.year}</p>
        <h1>{shooting.title}</h1>
        <div className="shooting-header__meta">
          {shooting.description ? (
            <p className="shooting-header__description">
              {localize(shooting.description, language)}
            </p>
          ) : null}
          <div className="shooting-header__facts">
            {shooting.location ? (
              <span>{localize(shooting.location, language)}</span>
            ) : null}
            {shooting.photographer ? (
              <span>Photography — {shooting.photographer}</span>
            ) : null}
          </div>
        </div>
      </header>

      <div className="editorial-flow">
        {rows.map((row, rowIndex) => (
          <div
            className={`editorial-row editorial-row--${row.kind}`}
            key={`${row.kind}-${rowIndex}`}
          >
            {row.photos.map((photo, photoIndex) => (
              <Fragment key={photo.id}>
                <Image
                  src={photo.src}
                  width={photo.width}
                  height={photo.height}
                  alt={photo.alt[language]}
                  sizes={
                    row.kind === 'pair'
                      ? '(max-width: 700px) 100vw, 45vw'
                      : '(max-width: 700px) 100vw, 88vw'
                  }
                  priority={rowIndex === 0 && photoIndex === 0}
                />
              </Fragment>
            ))}
          </div>
        ))}
      </div>

      <nav className="series-nav" aria-label="Series navigation">
        <Link href={`/shoots/${previous.slug}`}>
          ← {messages[language].previous}
        </Link>
        <Link href="/archive">{messages[language].backToArchive}</Link>
        <Link href={`/shoots/${next.slug}`}>{messages[language].next} →</Link>
      </nav>
      <Footer />
    </main>
  );
}
