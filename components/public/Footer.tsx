'use client';

import Link from 'next/link';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { profile } from '@/lib/content';
import { messages } from '@/lib/i18n';

export function Footer() {
  const { language } = useLanguage();
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <span>© {year} Zoe Schmidt</span>
      <a href={profile.instagram.href} target="_blank" rel="noreferrer">
        {messages[language].instagram}
      </a>
      <Link href="/profile">{messages[language].contact}</Link>
      <Link
        className="site-footer__studio"
        href="/studio/login"
        aria-label={messages[language].studioLogin}
      >
        ·
      </Link>
    </footer>
  );
}
