'use client';

import Image from 'next/image';
import { Footer } from '@/components/public/Footer';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { useSiteSettings } from '@/components/providers/SiteSettingsProvider';
import { localize, messages } from '@/lib/i18n';

export function ProfilePageContent() {
  const { language } = useLanguage();
  const settings = useSiteSettings();
  const representation = [
    settings.agencyName,
    localize(settings.agencyLocation, language),
  ]
    .filter(Boolean)
    .join(', ');
  const contactLabel =
    localize(settings.contactLabel, language) || messages[language].contact;
  const facts = [
    {
      label: messages[language].base,
      value: localize(settings.base, language),
    },
    { label: messages[language].height, value: settings.height },
    { label: messages[language].bust, value: settings.bust },
    { label: messages[language].waist, value: settings.waist },
    { label: messages[language].hips, value: settings.hips },
    { label: messages[language].shoeSize, value: settings.shoeSize },
    {
      label: messages[language].hair,
      value: localize(settings.hair, language),
    },
    {
      label: messages[language].eyes,
      value: localize(settings.eyes, language),
    },
    {
      label: messages[language].details,
      value: localize(settings.additionalDetail, language),
    },
    {
      label: messages[language].languages,
      value: localize(settings.languages, language),
    },
    {
      label: messages[language].availability,
      value: localize(settings.baseCities, language),
    },
    {
      label: messages[language].selectedClients,
      value: localize(settings.selectedClients, language),
    },
  ].filter((fact) => fact.value);
  const agencyBlock = Boolean(representation || settings.agencyBookingEmail);
  const showAgencyFirst = settings.emphasizeAgency && agencyBlock;
  const hasContactFacts = Boolean(
    agencyBlock ||
    settings.publicEmail ||
    settings.additionalContactValue ||
    settings.instagramUrl ||
    (settings.compCard.enabled && settings.compCard.url),
  );

  return (
    <main id="main-content" className="page-shell profile-page" tabIndex={-1}>
      <div className="profile-layout">
        <figure className="profile-portrait">
          <Image
            src={settings.portrait.src}
            width={settings.portrait.width}
            height={settings.portrait.height}
            alt={settings.portrait.alt[language] || settings.portrait.alt.en}
            sizes="(max-width: 760px) calc(100vw - 48px), 52vw"
            preload
          />
          {settings.portrait.credit || settings.portrait.photographer ? (
            <figcaption>
              {settings.portrait.credit ??
                `${messages[language].photography}: ${settings.portrait.photographer}`}
            </figcaption>
          ) : null}
        </figure>

        <section className="profile-copy">
          <p className="eyebrow">02 / {messages[language].profile}</p>
          <h1>{settings.modelName}</h1>
          {localize(settings.bio, language) ? (
            <p className="profile-copy__bio">
              {localize(settings.bio, language)}
            </p>
          ) : null}

          {facts.length ? (
            <dl className="profile-facts">
              {facts.map((fact) => (
                <div key={fact.label}>
                  <dt>{fact.label}</dt>
                  <dd>{fact.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}

          {hasContactFacts ? (
            <dl className="profile-facts profile-facts--contact">
              {showAgencyFirst ? (
                <AgencyFact
                  settings={settings}
                  representation={representation}
                />
              ) : null}
              {settings.publicEmail ? (
                <div>
                  <dt>{contactLabel}</dt>
                  <dd>
                    {settings.emailClickable ? (
                      <a href={`mailto:${settings.publicEmail}`}>
                        {settings.publicEmail}
                      </a>
                    ) : (
                      settings.publicEmail
                    )}
                  </dd>
                </div>
              ) : null}
              {!showAgencyFirst && agencyBlock ? (
                <AgencyFact
                  settings={settings}
                  representation={representation}
                />
              ) : null}
              {settings.additionalContactValue ? (
                <div>
                  <dt>
                    {localize(settings.additionalContactLabel, language) ||
                      messages[language].contact}
                  </dt>
                  <dd>
                    {settings.additionalContactUrl ? (
                      <a href={settings.additionalContactUrl}>
                        {settings.additionalContactValue}
                      </a>
                    ) : (
                      settings.additionalContactValue
                    )}
                  </dd>
                </div>
              ) : null}
              {settings.instagramUrl ? (
                <div>
                  <dt>{messages[language].instagram}</dt>
                  <dd>
                    <a
                      href={settings.instagramUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {settings.instagramHandle || messages[language].instagram}
                    </a>
                  </dd>
                </div>
              ) : null}
              {settings.compCard.enabled && settings.compCard.url ? (
                <div>
                  <dt>{messages[language].compCard}</dt>
                  <dd>
                    <a
                      href={settings.compCard.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {messages[language].viewCompCard}
                    </a>
                  </dd>
                </div>
              ) : null}
            </dl>
          ) : null}
        </section>
      </div>
      <Footer />
    </main>
  );
}

function AgencyFact({
  settings,
  representation,
}: {
  settings: ReturnType<typeof useSiteSettings>;
  representation: string;
}) {
  const { language } = useLanguage();
  return (
    <div>
      <dt>{messages[language].representation}</dt>
      <dd>
        {settings.agencyUrl && representation ? (
          <a href={settings.agencyUrl} target="_blank" rel="noreferrer">
            {representation}
          </a>
        ) : (
          representation
        )}
        {representation && settings.agencyBookingEmail ? <br /> : null}
        {settings.agencyBookingEmail ? (
          <a href={`mailto:${settings.agencyBookingEmail}`}>
            {settings.agencyBookingEmail}
          </a>
        ) : null}
      </dd>
    </div>
  );
}
