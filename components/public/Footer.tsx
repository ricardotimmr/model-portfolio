'use client';

import Link from 'next/link';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { useSiteSettings } from '@/components/providers/SiteSettingsProvider';
import { messages } from '@/lib/i18n';

export function Footer() {
  const { language, setLanguage } = useLanguage();
  const settings = useSiteSettings();
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <span>
        © {year} {settings.modelName}
      </span>
      {settings.instagramInFooter && settings.instagramUrl ? (
        <a href={settings.instagramUrl} target="_blank" rel="noreferrer">
          {settings.instagramHandle || messages[language].instagram}
        </a>
      ) : null}
      <Link href="/profile">{messages[language].contact}</Link>
      <div
        className="site-footer__language"
        role="group"
        aria-label={messages[language].language}
      >
        <button
          type="button"
          className={language === 'en' ? 'is-active' : undefined}
          aria-pressed={language === 'en'}
          onClick={() => setLanguage('en')}
        >
          EN
        </button>
        <span aria-hidden="true">/</span>
        <button
          type="button"
          className={language === 'de' ? 'is-active' : undefined}
          aria-pressed={language === 'de'}
          onClick={() => setLanguage('de')}
        >
          DE
        </button>
      </div>
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
