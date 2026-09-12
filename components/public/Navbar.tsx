'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useIndexView } from '@/components/providers/IndexViewProvider';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { messages } from '@/lib/i18n';
import { useModalFocus } from '@/lib/use-modal-focus';
import { YearOverlay } from './YearOverlay';

export function Navbar() {
  const pathname = usePathname();
  const { language, setLanguage } = useLanguage();
  const {
    mode: indexViewMode,
    isTransitioning: isIndexTransitioning,
    toggleMode: toggleIndexViewMode,
  } = useIndexView();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isYearOpen, setIsYearOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuReturnFocusRef = useRef<HTMLElement | null>(null);
  const yearButtonRef = useRef<HTMLButtonElement>(null);
  const yearReturnFocusRef = useRef<HTMLElement | null>(null);
  const currentYear = new Date().getFullYear();

  const closeMenu = useCallback(() => setIsMenuOpen(false), []);

  useModalFocus({
    active: isMenuOpen,
    containerRef: headerRef,
    onClose: closeMenu,
    initialFocusSelector: '.site-nav__link[aria-current="page"]',
    returnFocusRef: menuReturnFocusRef,
    inertSelector: '#site-content, .skip-link',
  });

  useEffect(() => {
    if (!isMenuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMenuOpen]);

  const links = [
    { href: '/', label: messages[language].index, active: pathname === '/' },
    {
      href: '/archive',
      label: messages[language].archive,
      active: pathname === '/archive',
    },
    {
      href: '/profile',
      label: messages[language].profile,
      active: pathname === '/profile',
    },
  ] as const;

  return (
    <>
      <header
        ref={headerRef}
        className={`site-nav ${isMenuOpen ? 'is-menu-open' : ''}`}
        tabIndex={-1}
      >
        <Link href="/" className="site-nav__brand" onClick={closeMenu}>
          Zoe Schmidt
        </Link>

        <button
          ref={menuButtonRef}
          type="button"
          className="site-nav__menu-trigger"
          aria-expanded={isMenuOpen}
          aria-controls="primary-navigation"
          onClick={() => {
            if (!isMenuOpen) {
              menuReturnFocusRef.current = menuButtonRef.current;
            }
            setIsMenuOpen((current) => !current);
          }}
        >
          {isMenuOpen ? messages[language].close : messages[language].menu}
        </button>

        <nav
          id="primary-navigation"
          className={`site-nav__links ${isMenuOpen ? 'is-open' : ''}`}
          aria-label={messages[language].primaryNavigation}
        >
          {links.map((link) =>
            link.href === '/' && link.active ? (
              <button
                key={link.href}
                type="button"
                className="site-nav__link is-active"
                aria-current="page"
                aria-disabled={isIndexTransitioning}
                disabled={isIndexTransitioning}
                aria-label={
                  indexViewMode === 'horizontal'
                    ? messages[language].showVerticalIndex
                    : messages[language].showHorizontalIndex
                }
                onClick={() => {
                  closeMenu();
                  toggleIndexViewMode();
                }}
              >
                {link.label}
              </button>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                className={`site-nav__link ${link.active ? 'is-active' : ''}`}
                aria-current={link.active ? 'page' : undefined}
                onClick={closeMenu}
              >
                {link.label}
              </Link>
            ),
          )}

          <div
            className="language-switch"
            role="group"
            aria-label={messages[language].language}
          >
            <button
              type="button"
              className={language === 'en' ? 'is-active' : undefined}
              aria-pressed={language === 'en'}
              onClick={() => {
                setLanguage('en');
                closeMenu();
              }}
            >
              EN
            </button>
            <span aria-hidden="true">/</span>
            <button
              type="button"
              className={language === 'de' ? 'is-active' : undefined}
              aria-pressed={language === 'de'}
              onClick={() => {
                setLanguage('de');
                closeMenu();
              }}
            >
              DE
            </button>
          </div>

          <button
            ref={yearButtonRef}
            type="button"
            className="site-nav__year"
            aria-haspopup="dialog"
            aria-expanded={isYearOpen}
            onClick={() => {
              yearReturnFocusRef.current = isMenuOpen
                ? menuButtonRef.current
                : yearButtonRef.current;
              closeMenu();
              setIsYearOpen(true);
            }}
          >
            [{currentYear}]
          </button>
        </nav>
      </header>

      <YearOverlay
        isOpen={isYearOpen}
        year={currentYear}
        onClose={() => setIsYearOpen(false)}
        triggerRef={yearReturnFocusRef}
      />
    </>
  );
}
