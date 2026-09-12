'use client';

import { ArchiveGrid } from '@/components/public/ArchiveGrid';
import { Footer } from '@/components/public/Footer';
import { useLanguage } from '@/components/providers/LanguageProvider';
import type { ArchiveItem } from '@/lib/content';
import { messages } from '@/lib/i18n';

type ArchivePageContentProps = {
  items: ArchiveItem[];
};

export function ArchivePageContent({ items }: ArchivePageContentProps) {
  const { language } = useLanguage();

  return (
    <main id="main-content" className="page-shell archive-page" tabIndex={-1}>
      <header className="page-heading">
        <p className="eyebrow">01 / {messages[language].archive}</p>
        <h1>{messages[language].archive}</h1>
        <p>{messages[language].archiveIntro}</p>
      </header>
      {items.length > 0 ? (
        <ArchiveGrid items={items} />
      ) : (
        <p className="portfolio-empty portfolio-empty--archive">
          {messages[language].emptyArchive}
        </p>
      )}
      <Footer />
    </main>
  );
}
