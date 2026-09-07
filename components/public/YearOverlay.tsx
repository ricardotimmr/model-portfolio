'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, type RefObject } from 'react';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { yearStatement } from '@/lib/content';
import { localize, messages } from '@/lib/i18n';

type YearOverlayProps = {
  isOpen: boolean;
  year: number;
  onClose: () => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
};

export function YearOverlay({
  isOpen,
  year,
  onClose,
  triggerRef,
}: YearOverlayProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const { language } = useLanguage();

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    const trigger = triggerRef.current;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
      trigger?.focus();
    };
  }, [isOpen, onClose, triggerRef]);

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          className="year-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <motion.div
            ref={dialogRef}
            className="year-overlay__content"
            role="dialog"
            aria-modal="true"
            aria-labelledby="year-overlay-title"
            tabIndex={-1}
            initial={{ y: 18, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -12, opacity: 0 }}
            transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
          >
            <p id="year-overlay-title" className="eyebrow">
              [{year}]
            </p>
            <p className="year-overlay__statement">
              {localize(yearStatement, language)}
            </p>
            <button
              className="year-overlay__close"
              type="button"
              onClick={onClose}
            >
              {messages[language].close}
            </button>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
