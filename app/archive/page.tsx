'use client';

import { ArchiveGrid } from '@/components/public/ArchiveGrid';
import { Footer } from '@/components/public/Footer';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { messages } from '@/lib/i18n';

export default function ArchivePage() {
  const { language } = useLanguage();

  return (
    <main id="main-content" className="page-shell archive-page">
      <header className="page-heading">
        <p className="eyebrow">01 / {messages[language].archive}</p>
        <h1>{messages[language].archive}</h1>
        <p>{messages[language].archiveIntro}</p>
      </header>
      <ArchiveGrid />
      <Footer />
    </main>
  );
}
