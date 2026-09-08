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
    emptyIndex: 'No published series are available yet.',
    emptyArchive: 'No published photographs are available yet.',
    showVerticalIndex: 'Show vertical index',
    showHorizontalIndex: 'Show horizontal index',
    scroll: 'Scroll to explore',
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
    emptyIndex: 'Noch sind keine veröffentlichten Serien verfügbar.',
    emptyArchive: 'Noch sind keine veröffentlichten Fotografien verfügbar.',
    showVerticalIndex: 'Vertikalen Index anzeigen',
    showHorizontalIndex: 'Horizontalen Index anzeigen',
    scroll: 'Scrollen zum Entdecken',
  },
} as const;

export function localize(value: LocalizedText | undefined, language: Language) {
  return value?.[language] ?? '';
}
