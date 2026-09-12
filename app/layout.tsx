import '@fontsource-variable/instrument-sans';
import '@fontsource/instrument-serif/400.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { IndexViewProvider } from '@/components/providers/IndexViewProvider';
import { Intro } from '@/components/public/Intro';
import { Navbar } from '@/components/public/Navbar';
import { LanguageProvider } from '@/components/providers/LanguageProvider';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://zoe-schmidt.com'),
  title: {
    default: 'Zoe Schmidt — Model Portfolio',
    template: '%s — Zoe Schmidt',
  },
  description: 'The model portfolio of Zoe Schmidt, based in Wiehl, Germany.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <LanguageProvider>
          <IndexViewProvider>
            <a className="skip-link" href="#main-content">
              Skip to content
            </a>
            <Navbar />
            {children}
            <Intro />
          </IndexViewProvider>
        </LanguageProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
