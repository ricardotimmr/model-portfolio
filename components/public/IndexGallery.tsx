'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent,
} from 'react';
import { useLanguage } from '@/components/providers/LanguageProvider';
import type { Shooting } from '@/lib/content';
import { getCover } from '@/lib/content';
import {
  GALLERY_SCROLL_INERTIAL_LERP,
  GALLERY_SCROLL_MAX_WHEEL_DELTA,
  GALLERY_SCROLL_WHEEL_DRAG_FACTOR,
  normalizeWheelDeltaToPixels,
} from '@/lib/gallery-physics';
import { messages } from '@/lib/i18n';

type IndexGalleryProps = { shootings: Shooting[] };
type CardMetric = {
  element: HTMLElement;
  image: HTMLImageElement;
  center: number;
  halfWidth: number;
};

const REPEATED_SET_COUNT = 7;
const MIDDLE_SET_INDEX = Math.floor(REPEATED_SET_COUNT / 2);
const POSITION_KEY = 'model-portfolio:index-position';
const HINT_KEY = 'model-portfolio:gallery-used';
const DRAG_CLICK_THRESHOLD = 6;
const CENTER_THRESHOLD = 5;

function supportsPointer(event: ReactPointerEvent<HTMLDivElement>) {
  if (!event.isPrimary) return false;
  if (event.pointerType === 'mouse') return event.button === 0;
  return event.pointerType === 'touch' || event.pointerType === 'pen';
}

export function IndexGallery({ shootings }: IndexGalleryProps) {
  const router = useRouter();
  const { language } = useLanguage();
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const firstSetRef = useRef<HTMLDivElement>(null);
  const setWidthRef = useRef(0);
  const currentXRef = useRef(0);
  const targetXRef = useRef(0);
  const animationRef = useRef<number | null>(null);
  const metricsRef = useRef<CardMetric[]>([]);
  const activePointerRef = useRef<number | null>(null);
  const dragStartXRef = useRef(0);
  const dragStartTrackRef = useRef(0);
  const lastPointerXRef = useRef(0);
  const lastPointerTimeRef = useRef(0);
  const velocityRef = useRef(0);
  const draggedRef = useRef(false);
  const focusAnimationRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const [centeredSlug, setCenteredSlug] = useState(shootings[0]?.slug ?? '');
  const [isActionAvailable, setIsActionAvailable] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const slides = useMemo(
    () =>
      shootings.map((shooting) => ({ shooting, cover: getCover(shooting) })),
    [shootings],
  );

  const normalizePosition = useCallback(() => {
    const setWidth = setWidthRef.current;
    if (!setWidth) return;
    const anchor = setWidth * MIDDLE_SET_INDEX;
    while (currentXRef.current < anchor - setWidth) {
      currentXRef.current += setWidth;
      targetXRef.current += setWidth;
    }
    while (currentXRef.current > anchor + setWidth) {
      currentXRef.current -= setWidth;
      targetXRef.current -= setWidth;
    }
  }, []);

  const updateVisuals = useCallback(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track) return;

    track.style.transform = `translate3d(${-currentXRef.current}px, 0, 0)`;
    window.sessionStorage.setItem(POSITION_KEY, String(currentXRef.current));

    const viewportCenter = currentXRef.current + viewport.clientWidth / 2;
    let nearest: CardMetric | undefined;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const metric of metricsRef.current) {
      const distance = metric.center - viewportCenter;
      const ratio = Math.max(
        -1,
        Math.min(1, distance / Math.max(1, viewport.clientWidth * 0.7)),
      );
      metric.image.style.transform = `translate3d(${(-ratio * 58).toFixed(2)}px, 0, 0) scale(1.3)`;
      metric.element.classList.remove('is-centered');
      if (Math.abs(distance) < nearestDistance) {
        nearest = metric;
        nearestDistance = Math.abs(distance);
      }
    }

    if (nearest) {
      nearest.element.classList.add('is-centered');
      const actionAvailable = nearestDistance <= nearest.halfWidth;
      setIsActionAvailable((current) =>
        current === actionAvailable ? current : actionAvailable,
      );
      const slug = nearest.element.dataset.shootingSlug;
      if (slug)
        setCenteredSlug((current) => (current === slug ? current : slug));
    }
  }, []);

  const runAnimation = useCallback(() => {
    const distance = targetXRef.current - currentXRef.current;
    if (Math.abs(distance) <= 0.15) {
      currentXRef.current = targetXRef.current;
      focusAnimationRef.current = false;
      normalizePosition();
      updateVisuals();
      animationRef.current = null;
      return;
    }
    const lerp = focusAnimationRef.current
      ? GALLERY_SCROLL_INERTIAL_LERP * 0.62
      : GALLERY_SCROLL_INERTIAL_LERP;
    currentXRef.current += distance * lerp;
    normalizePosition();
    updateVisuals();
    // The animation loop intentionally schedules its own next frame.
    // eslint-disable-next-line react-hooks/immutability
    animationRef.current = window.requestAnimationFrame(runAnimation);
  }, [normalizePosition, updateVisuals]);

  const startAnimation = useCallback(() => {
    if (animationRef.current === null) {
      animationRef.current = window.requestAnimationFrame(runAnimation);
    }
  }, [runAnimation]);

  const markUsed = () => {
    setShowHint(false);
    window.sessionStorage.setItem(HINT_KEY, 'true');
  };

  const focusCard = useCallback(
    (card: HTMLElement) => {
      const viewport = viewportRef.current;
      if (!viewport) return;
      focusAnimationRef.current = true;
      targetXRef.current =
        card.offsetLeft + card.offsetWidth / 2 - viewport.clientWidth / 2;
      startAnimation();
    },
    [startAnimation],
  );

  const activateCard = useCallback(
    (card: HTMLElement) => {
      const viewport = viewportRef.current;
      if (!viewport) return;
      const viewportRect = viewport.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();
      const delta = Math.abs(
        cardRect.left +
          cardRect.width / 2 -
          (viewportRect.left + viewportRect.width / 2),
      );
      if (delta <= CENTER_THRESHOLD) {
        const slug = card.dataset.shootingSlug;
        if (slug) router.push(`/shoots/${slug}`);
      } else {
        focusCard(card);
      }
      markUsed();
    },
    [focusCard, router],
  );

  useEffect(() => {
    // Session storage is an external browser source and is only available after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShowHint(window.sessionStorage.getItem(HINT_KEY) !== 'true');
    const firstSet = firstSetRef.current;
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!firstSet || !viewport || !track) return;

    const measure = () => {
      setWidthRef.current = firstSet.scrollWidth;
      metricsRef.current = Array.from(
        track.querySelectorAll<HTMLElement>('[data-gallery-card]'),
      )
        .map((element) => {
          const image = element.querySelector('img');
          return image
            ? {
                element,
                image,
                center: element.offsetLeft + element.offsetWidth / 2,
                halfWidth: element.offsetWidth / 2,
              }
            : null;
        })
        .filter((metric): metric is CardMetric => metric !== null);

      const stored = Number(window.sessionStorage.getItem(POSITION_KEY));
      const firstCard = firstSet.querySelector<HTMLElement>(
        '[data-gallery-card]',
      );
      const initial =
        Number.isFinite(stored) && stored > 0
          ? stored
          : setWidthRef.current * MIDDLE_SET_INDEX +
            (firstCard?.offsetWidth ?? 0) / 2 -
            viewport.clientWidth / 2;
      currentXRef.current = initial;
      targetXRef.current = initial;
      normalizePosition();
      updateVisuals();
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(firstSet);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
      if (animationRef.current !== null)
        window.cancelAnimationFrame(animationRef.current);
    };
  }, [normalizePosition, updateVisuals]);

  const onWheel = (event: WheelEvent<HTMLDivElement>) => {
    const viewportWidth = viewportRef.current?.clientWidth ?? window.innerWidth;
    const dx = normalizeWheelDeltaToPixels(
      event.deltaX,
      event.deltaMode,
      viewportWidth,
    );
    const dy = normalizeWheelDeltaToPixels(
      event.deltaY,
      event.deltaMode,
      viewportWidth,
    );
    const delta = Math.abs(dx) >= Math.abs(dy) ? dx : dy;
    if (!delta) return;
    event.preventDefault();
    focusAnimationRef.current = false;
    targetXRef.current +=
      Math.max(
        -GALLERY_SCROLL_MAX_WHEEL_DELTA,
        Math.min(GALLERY_SCROLL_MAX_WHEEL_DELTA, delta),
      ) * GALLERY_SCROLL_WHEEL_DRAG_FACTOR;
    markUsed();
    startAnimation();
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!supportsPointer(event) || !viewportRef.current) return;
    activePointerRef.current = event.pointerId;
    dragStartXRef.current = event.clientX;
    dragStartTrackRef.current = targetXRef.current;
    lastPointerXRef.current = event.clientX;
    lastPointerTimeRef.current = performance.now();
    velocityRef.current = 0;
    draggedRef.current = false;
    focusAnimationRef.current = false;
    setIsDragging(true);
    if (animationRef.current !== null) {
      window.cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    viewportRef.current.setPointerCapture(event.pointerId);
    if (event.pointerType !== 'mouse') event.preventDefault();
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (activePointerRef.current !== event.pointerId) return;
    const now = performance.now();
    const elapsed = Math.max(1, now - lastPointerTimeRef.current);
    const pointerDelta = event.clientX - lastPointerXRef.current;
    velocityRef.current +=
      (-pointerDelta / elapsed - velocityRef.current) * 0.24;
    lastPointerXRef.current = event.clientX;
    lastPointerTimeRef.current = now;
    const dragDelta = event.clientX - dragStartXRef.current;
    if (Math.abs(dragDelta) >= DRAG_CLICK_THRESHOLD) draggedRef.current = true;
    currentXRef.current = dragStartTrackRef.current - dragDelta;
    targetXRef.current = currentXRef.current;
    normalizePosition();
    updateVisuals();
    event.preventDefault();
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (activePointerRef.current !== event.pointerId) return;
    viewportRef.current?.releasePointerCapture(event.pointerId);
    activePointerRef.current = null;
    setIsDragging(false);
    markUsed();

    if (draggedRef.current) {
      const velocity = Math.max(-1.8, Math.min(1.8, velocityRef.current));
      targetXRef.current =
        currentXRef.current + Math.max(-1500, Math.min(1500, velocity * 460));
      startAnimation();
      return;
    }

    const card = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>('[data-gallery-card]');
    if (card) activateCard(card);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>, card: HTMLElement) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      activateCard(card);
      return;
    }
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const direction = event.key === 'ArrowRight' ? 1 : -1;
    const nextIndex =
      (Number(card.dataset.slideIndex) + direction + slides.length) %
      slides.length;
    const nextCard = trackRef.current?.querySelector<HTMLElement>(
      `[data-set-index="${MIDDLE_SET_INDEX}"][data-slide-index="${nextIndex}"]`,
    );
    if (nextCard) {
      nextCard.focus();
      focusCard(nextCard);
    }
  };

  return (
    <main
      id="main-content"
      className={`index-gallery ${isDragging ? 'is-dragging' : ''}`}
    >
      <div
        ref={viewportRef}
        className="index-gallery__viewport"
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          activePointerRef.current = null;
          setIsDragging(false);
        }}
      >
        <div ref={trackRef} className="index-gallery__track">
          {Array.from({ length: REPEATED_SET_COUNT }, (_, setIndex) => (
            <div
              ref={setIndex === 0 ? firstSetRef : undefined}
              className="index-gallery__set"
              key={setIndex}
              aria-hidden={setIndex !== MIDDLE_SET_INDEX}
            >
              {slides.map(({ shooting, cover }, slideIndex) => (
                <article
                  key={`${setIndex}-${shooting.id}`}
                  tabIndex={setIndex === MIDDLE_SET_INDEX ? 0 : -1}
                  className={`index-gallery__card index-gallery__card--${cover.orientation}`}
                  data-gallery-card
                  data-set-index={setIndex}
                  data-slide-index={slideIndex}
                  data-shooting-slug={shooting.slug}
                  aria-label={`${shooting.title}, ${shooting.year}`}
                  role="link"
                  onClick={(event) => {
                    if (!draggedRef.current) activateCard(event.currentTarget);
                  }}
                  onKeyDown={(event) => onKeyDown(event, event.currentTarget)}
                >
                  <Image
                    className="index-gallery__image"
                    src={cover.src}
                    width={cover.width}
                    height={cover.height}
                    alt={
                      setIndex === MIDDLE_SET_INDEX ? cover.alt[language] : ''
                    }
                    sizes="(max-width: 768px) 76vw, (max-width: 1100px) 52vw, 42vw"
                    loading="eager"
                    draggable={false}
                  />
                  <span className="index-gallery__caption">
                    <span>{shooting.title}</span>
                    <span>{shooting.year}</span>
                  </span>
                </article>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div
        className={`index-gallery__action ${isActionAvailable ? 'is-visible' : ''}`}
        aria-hidden="true"
      >
        <span>{messages[language].open}</span>
        <span className="index-gallery__action-title">
          {shootings.find((item) => item.slug === centeredSlug)?.title}
        </span>
      </div>
      {showHint ? (
        <p className="index-gallery__hint">‹ {messages[language].drag} ›</p>
      ) : null}
    </main>
  );
}
