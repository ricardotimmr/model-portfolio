'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useLanguage } from '@/components/providers/LanguageProvider';
import type { ArchiveItem } from '@/lib/content';

type ArchiveGridProps = {
  items: ArchiveItem[];
};

export function ArchiveGrid({ items }: ArchiveGridProps) {
  const { language } = useLanguage();

  return (
    <div className="archive-grid">
      {items.map(({ photo, shooting }, index) => (
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
              sizes="(max-width: 760px) calc(100vw - 48px), 31vw"
              loading={index < 3 ? 'eager' : 'lazy'}
              fetchPriority={index === 0 ? 'high' : 'auto'}
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
