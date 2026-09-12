'use client';

import { useLanguage } from '@/components/providers/LanguageProvider';
import { messages } from '@/lib/i18n';

export function IndexEmptyState() {
  const { language } = useLanguage();

  return (
    <main
      id="main-content"
      className="portfolio-empty portfolio-empty--index"
      data-index-empty="true"
      tabIndex={-1}
    >
      <p className="eyebrow">{messages[language].index}</p>
      <p>{messages[language].emptyIndex}</p>
    </main>
  );
}
