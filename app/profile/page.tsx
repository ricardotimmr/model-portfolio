'use client';

import Image from 'next/image';
import { Footer } from '@/components/public/Footer';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { profile } from '@/lib/content';
import { messages } from '@/lib/i18n';

export default function ProfilePage() {
  const { language } = useLanguage();

  return (
    <main id="main-content" className="page-shell profile-page">
      <div className="profile-layout">
        <div className="profile-portrait">
          <Image
            src={profile.portrait.src}
            width={profile.portrait.width}
            height={profile.portrait.height}
            alt={profile.portrait.alt[language]}
            sizes="(max-width: 760px) 100vw, 52vw"
            priority
          />
        </div>

        <section className="profile-copy">
          <p className="eyebrow">02 / {messages[language].profile}</p>
          <h1>{profile.name}</h1>
          <p className="profile-copy__bio">{profile.bio[language]}</p>

          <dl className="profile-facts">
            <div>
              <dt>{messages[language].base}</dt>
              <dd>{profile.base[language]}</dd>
            </div>
            <div>
              <dt>{messages[language].instagram}</dt>
              <dd>
                <a
                  href={profile.instagram.href}
                  target="_blank"
                  rel="noreferrer"
                >
                  {profile.instagram.label}
                </a>
              </dd>
            </div>
          </dl>
        </section>
      </div>
      <Footer />
    </main>
  );
}
