'use client';

import Link from 'next/link';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { messages } from '@/lib/i18n';

export default function NotFound() {
  const { language } = useLanguage();

  return (
    <main id="main-content" className="not-found" tabIndex={-1}>
      <p className="eyebrow">404</p>
      <h1>{messages[language].seriesNotFound}</h1>
      <Link href="/">{messages[language].returnToIndex}</Link>
    </main>
  );
}
