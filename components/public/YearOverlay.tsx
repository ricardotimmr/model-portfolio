'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef, type RefObject } from 'react';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { yearStatement } from '@/lib/content';
import { localize, messages } from '@/lib/i18n';
import { PUBLIC_MOTION } from '@/lib/public-motion';

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
  const prefersReducedMotion = useReducedMotion();

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
          transition={{
            duration: prefersReducedMotion
              ? PUBLIC_MOTION.reduced
              : PUBLIC_MOTION.metadata,
          }}
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
            transition={{
              duration: prefersReducedMotion
                ? PUBLIC_MOTION.reduced
                : PUBLIC_MOTION.route,
              ease: PUBLIC_MOTION.easeOut,
            }}
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
