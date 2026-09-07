'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { archivePhotos } from '@/lib/content';

export function ArchiveGrid() {
  const { language } = useLanguage();

  return (
    <div className="archive-grid">
      {archivePhotos.map(({ photo, shooting }, index) => (
        <Link
          className="archive-item"
          href={`/shoots/${shooting.slug}`}
          key={photo.id}
        >
          <span className="archive-item__image-wrap">
            <Image
              src={photo.src}
              width={photo.width}
              height={photo.height}
              alt={photo.alt[language]}
              sizes="(max-width: 680px) 100vw, (max-width: 1024px) 50vw, 33vw"
              priority={index < 3}
            />
          </span>
          <span className="archive-item__meta">
            <span>{shooting.title}</span>
            <span>{shooting.year}</span>
          </span>
        </Link>
      ))}
    </div>
  );
}
