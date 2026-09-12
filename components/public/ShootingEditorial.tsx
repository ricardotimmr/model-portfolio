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
  previous?: ShootingNavigationItem;
  next?: ShootingNavigationItem;
  studioPreview?: boolean;
};

type EditorialRow = {
  kind: 'hero' | 'pair' | 'wide' | 'single-left' | 'single-right';
  photos: PortfolioPhoto[];
};

function getEditorialImageSizes(kind: EditorialRow['kind']) {
  if (kind === 'pair') return '(max-width: 760px) calc(100vw - 48px), 40vw';
  if (kind === 'single-left' || kind === 'single-right') {
    return '(max-width: 760px) calc(100vw - 48px), 48vw';
  }
  if (kind === 'wide') {
    return '(max-width: 760px) calc(100vw - 48px), 88vw';
  }
  return '(max-width: 760px) calc(100vw - 48px), (min-width: 1552px) 1440px, 93vw';
}

function buildEditorialRows(shooting: Shooting) {
  const photos = shooting.photos.filter((photo) => photo.shootingVisible);
  const rows: EditorialRow[] = [];
  let portraitSide = 0;
  for (let index = 0; index < photos.length; index += 1) {
    const current = photos[index];
    const next = photos[index + 1];

    if (current.layoutHint === 'pair-next' && next) {
      rows.push({ kind: 'pair', photos: [current, next] });
      index += 1;
      continue;
    }
    if (current.layoutHint === 'full') {
      rows.push({ kind: 'hero', photos: [current] });
      continue;
    }
    if (current.layoutHint === 'wide') {
      rows.push({ kind: 'wide', photos: [current] });
      continue;
    }
    if (current.layoutHint === 'left') {
      rows.push({ kind: 'single-left', photos: [current] });
      continue;
    }
    if (current.layoutHint === 'right') {
      rows.push({ kind: 'single-right', photos: [current] });
      continue;
    }
    if (current.layoutHint === 'medium') {
      rows.push({
        kind: portraitSide++ % 2 === 0 ? 'single-left' : 'single-right',
        photos: [current],
      });
      continue;
    }
    if (index === 0) {
      rows.push({ kind: 'hero', photos: [current] });
      continue;
    }
    if (
      current.orientation === 'portrait' &&
      next?.orientation === 'portrait' &&
      (!next.layoutHint || next.layoutHint === 'auto')
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
  studioPreview = false,
}: ShootingEditorialProps) {
  const { language } = useLanguage();
  const rows = buildEditorialRows(shooting);
  const credits = [
    shooting.location
      ? {
          label: messages[language].location,
          value: localize(shooting.location, language),
        }
      : null,
    shooting.photographer
      ? {
          label: messages[language].photography,
          value: shooting.photographer,
        }
      : null,
    shooting.styling
      ? { label: messages[language].styling, value: shooting.styling }
      : null,
    shooting.makeup
      ? { label: messages[language].makeup, value: shooting.makeup }
      : null,
    shooting.hair
      ? { label: messages[language].hair, value: shooting.hair }
      : null,
    shooting.client
      ? { label: messages[language].client, value: shooting.client }
      : null,
    shooting.credits
      ? { label: messages[language].credits, value: shooting.credits }
      : null,
  ].filter((item) => item !== null);

  return (
    <main id="main-content" className="page-shell shooting-page">
      <header className="shooting-header">
        <p className="eyebrow">
          {messages[language].series} / {shooting.year}
        </p>
        <h1>{shooting.title}</h1>
        <div className="shooting-header__meta">
          {shooting.description ? (
            <p className="shooting-header__description">
              {localize(shooting.description, language)}
            </p>
          ) : null}
          {credits.length > 0 ? (
            <dl className="shooting-header__facts">
              {credits.map((credit) => (
                <div key={credit.label}>
                  <dt>{credit.label}</dt>
                  <dd>{credit.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
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
                {rowIndex === 0 && photoIndex === 0 ? (
                  <Image
                    src={photo.src}
                    width={photo.width}
                    height={photo.height}
                    alt={photo.alt[language]}
                    sizes={getEditorialImageSizes(row.kind)}
                    preload
                  />
                ) : (
                  <Image
                    src={photo.src}
                    width={photo.width}
                    height={photo.height}
                    alt={photo.alt[language]}
                    sizes={getEditorialImageSizes(row.kind)}
                    loading="lazy"
                  />
                )}
              </Fragment>
            ))}
          </div>
        ))}
      </div>

      {previous && next ? (
        <nav className="series-nav" aria-label="Series navigation">
          <Link href={`/shoots/${previous.slug}`}>
            ← {messages[language].previous}
          </Link>
          <Link href="/archive">{messages[language].backToArchive}</Link>
          <Link href={`/shoots/${next.slug}`}>{messages[language].next} →</Link>
        </nav>
      ) : null}
      {studioPreview ? null : <Footer />}
    </main>
  );
}
