import type { Language, LocalizedText } from './content';

export const messages = {
  en: {
    index: 'Index',
    archive: 'Lookbook',
    profile: 'Profile',
    menu: 'Menu',
    close: 'Close',
    open: 'Open',
    drag: 'Drag to explore',
    tap: 'Tap to open',
    base: 'Base',
    contact: 'Contact',
    instagram: 'Instagram',
    previous: 'Previous series',
    next: 'Next series',
    backToArchive: 'Lookbook',
    archiveIntro: 'Selected photographs from published series.',
  },
  de: {
    index: 'Index',
    archive: 'Lookbook',
    profile: 'Profil',
    menu: 'Menü',
    close: 'Schließen',
    open: 'Öffnen',
    drag: 'Ziehen zum Entdecken',
    tap: 'Tippen zum Öffnen',
    base: 'Standort',
    contact: 'Kontakt',
    instagram: 'Instagram',
    previous: 'Vorherige Serie',
    next: 'Nächste Serie',
    backToArchive: 'Lookbook',
    archiveIntro: 'Ausgewählte Fotografien aus veröffentlichten Serien.',
  },
} as const;

export function localize(value: LocalizedText | undefined, language: Language) {
  return value?.[language] ?? '';
}
