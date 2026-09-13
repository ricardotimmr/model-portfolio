import '@fontsource-variable/instrument-sans';
import '@fontsource/instrument-serif/400.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { IndexViewProvider } from '@/components/providers/IndexViewProvider';
import { Intro } from '@/components/public/Intro';
import { Navbar } from '@/components/public/Navbar';
import { RouteFocusManager } from '@/components/public/RouteFocusManager';
import { SkipLink } from '@/components/public/SkipLink';
import { LanguageProvider } from '@/components/providers/LanguageProvider';
import { SiteSettingsProvider } from '@/components/providers/SiteSettingsProvider';
import { getPublicSiteSettings } from '@/db/site-settings-queries';
import './globals.css';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicSiteSettings();
  return {
    metadataBase: new URL('https://zoe-schmidt.com'),
    title: {
      default: `${settings.modelName} — Model Portfolio`,
      template: `%s — ${settings.modelName}`,
    },
    description:
      settings.bio?.en ?? `The model portfolio of ${settings.modelName}.`,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const settings = await getPublicSiteSettings();
  return (
    <html lang="en">
      <body>
        <LanguageProvider>
          <SiteSettingsProvider settings={settings}>
            <IndexViewProvider>
              <SkipLink />
              <Navbar />
              <RouteFocusManager />
              <div id="site-content">
                {children}
                <Intro />
              </div>
            </IndexViewProvider>
          </SiteSettingsProvider>
        </LanguageProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
