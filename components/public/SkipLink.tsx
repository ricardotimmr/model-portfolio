'use client';

import { useLanguage } from '@/components/providers/LanguageProvider';
import { messages } from '@/lib/i18n';

export function SkipLink() {
  const { language } = useLanguage();

  return (
    <a className="skip-link" href="#main-content">
      {messages[language].skipToContent}
    </a>
  );
}
