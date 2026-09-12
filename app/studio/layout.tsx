import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Studio',
  robots: {
    index: false,
    follow: false,
    noarchive: true,
  },
};

export default function StudioLayout({ children }: { children: ReactNode }) {
  return (
    <div className="studio-shell" lang="en">
      {children}
    </div>
  );
}
