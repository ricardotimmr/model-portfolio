'use client';

import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function getFocusableElements(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ).filter(
    (element) =>
      !element.closest('[inert]') &&
      element.getAttribute('aria-hidden') !== 'true' &&
      element.getClientRects().length > 0,
  );
}

type UseModalFocusOptions = {
  active: boolean;
  containerRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  initialFocusRef?: RefObject<HTMLElement | null>;
  initialFocusSelector?: string;
  returnFocusRef?: RefObject<HTMLElement | null>;
  inertSelector: string;
};

export function useModalFocus({
  active,
  containerRef,
  onClose,
  initialFocusRef,
  initialFocusSelector,
  returnFocusRef,
  inertSelector,
}: UseModalFocusOptions) {
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    const fallbackReturnTarget =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const explicitReturnTarget = returnFocusRef?.current ?? null;
    const inertElements = Array.from(
      document.querySelectorAll<HTMLElement>(inertSelector),
    ).filter((element) => !container.contains(element));
    const previousInertValues = inertElements.map((element) => element.inert);

    inertElements.forEach((element) => {
      element.inert = true;
    });

    const focusInitialElement = () => {
      const initial = initialFocusSelector
        ? container.querySelector<HTMLElement>(initialFocusSelector)
        : null;
      const focusable = getFocusableElements(container);
      (
        initialFocusRef?.current ??
        initial ??
        focusable[0] ??
        container
      ).focus();
    };
    const frame = window.requestAnimationFrame(focusInitialElement);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeRef.current();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = getFocusableElements(container);
      if (focusable.length === 0) {
        event.preventDefault();
        container.focus();
        return;
      }

      const first = focusable[0]!;
      const last = focusable.at(-1)!;
      const current = document.activeElement;
      if (
        event.shiftKey &&
        (current === first || !container.contains(current))
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (current === last || !container.contains(current))
      ) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);

    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKeyDown);
      inertElements.forEach((element, index) => {
        element.inert = previousInertValues[index] ?? false;
      });

      const returnTarget = explicitReturnTarget ?? fallbackReturnTarget;
      if (returnTarget?.isConnected) returnTarget.focus();
    };
  }, [
    active,
    containerRef,
    inertSelector,
    initialFocusRef,
    initialFocusSelector,
    returnFocusRef,
  ]);
}
