'use client';

import { motion, useReducedMotion } from 'motion/react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { useIndexView } from '@/components/providers/IndexViewProvider';
import { useLanguage } from '@/components/providers/LanguageProvider';
import type { Shooting } from '@/lib/content';
import { getCover } from '@/lib/content';
import {
  GALLERY_SCROLL_INERTIAL_LERP,
  GALLERY_SCROLL_MAX_WHEEL_DELTA,
  GALLERY_SCROLL_WHEEL_DRAG_FACTOR,
  getSafeParallaxShift,
  normalizeWheelDeltaToPixels,
} from '@/lib/gallery-physics';
import { PUBLIC_MOTION } from '@/lib/public-motion';
import { messages } from '@/lib/i18n';
import { VerticalIndexGallery } from './VerticalIndexGallery';

type IndexGalleryProps = { shootings: Shooting[] };
type HorizontalIndexGalleryProps = IndexGalleryProps & {
  initialKey: string;
  onActiveItemChange: (slug: string, key: string) => void;
  preferInitialItem: boolean;
  isActive: boolean;
  isTransitioning: boolean;
};
type TransitionRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};
type TransitionImageTransform = {
  x: number;
  y: number;
  scale: number;
};
type TransitionCard = {
  key: string;
  src: string;
  from: TransitionRect;
  to: TransitionRect;
  fromImage: TransitionImageTransform;
  toImage: TransitionImageTransform;
};
type CardMetric = {
  element: HTMLElement;
  image: HTMLImageElement;
  key: string;
  center: number;
  halfWidth: number;
  maxImageShift: number;
  lastShift: number;
  isActive: boolean;
};

const REPEATED_SET_COUNT = 5;
const MIDDLE_SET_INDEX = Math.floor(REPEATED_SET_COUNT / 2);
const POSITION_KEY = 'model-portfolio:index-position';
const HINT_KEY = 'model-portfolio:gallery-used';
const DRAG_CLICK_THRESHOLD = 6;
const TOUCH_DRAG_CLICK_THRESHOLD = 10;
const CENTER_THRESHOLD = 5;
const CARD_IMAGE_PARALLAX_MAX_SHIFT_PX = 112;
const CARD_IMAGE_PARALLAX_SCALE = 1.5;
const TRANSITION_CARD_RADIUS = 2;
const POINTER_RELEASE_MOMENTUM = 460;
const TOUCH_RELEASE_MOMENTUM = 360;

function getImageTransform(image: HTMLImageElement): TransitionImageTransform {
  const transform = window.getComputedStyle(image).transform;
  if (!transform || transform === 'none') return { x: 0, y: 0, scale: 1 };

  try {
    const matrix = new DOMMatrixReadOnly(transform);
    return {
      x: matrix.m41,
      y: matrix.m42,
      scale: Math.hypot(matrix.m11, matrix.m12),
    };
  } catch {
    return { x: 0, y: 0, scale: 1 };
  }
}

function supportsPointer(event: ReactPointerEvent<HTMLDivElement>) {
  if (!event.isPrimary) return false;
  if (event.pointerType === 'mouse') return event.button === 0;
  return event.pointerType === 'touch' || event.pointerType === 'pen';
}

function HorizontalIndexGallery({
  shootings,
  initialKey,
  onActiveItemChange,
  preferInitialItem,
  isActive,
  isTransitioning,
}: HorizontalIndexGalleryProps) {
  const router = useRouter();
  const { language } = useLanguage();
  const prefersReducedMotion = useReducedMotion();
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const firstSetRef = useRef<HTMLDivElement>(null);
  const setWidthRef = useRef(0);
  const currentXRef = useRef(0);
  const targetXRef = useRef(0);
  const animationRef = useRef<number | null>(null);
  const metricsRef = useRef<CardMetric[]>([]);
  const activePointerRef = useRef<number | null>(null);
  const activePointerTypeRef = useRef('mouse');
  const dragThresholdRef = useRef(DRAG_CLICK_THRESHOLD);
  const dragStartXRef = useRef(0);
  const dragStartTrackRef = useRef(0);
  const lastPointerXRef = useRef(0);
  const lastPointerTimeRef = useRef(0);
  const velocityRef = useRef(0);
  const draggedRef = useRef(false);
  const skipNextClickRef = useRef(false);
  const focusAnimationRef = useRef(false);
  const hasPositionedRef = useRef(false);
  const initialKeyRef = useRef(initialKey);
  const preferInitialItemRef = useRef(preferInitialItem);
  const centeredCardKeyRef = useRef(initialKey);
  const centeredSlugRef = useRef(shootings[0]?.slug ?? '');
  const actionAvailableRef = useRef(false);
  const hasUsedGalleryRef = useRef(false);
  const isActiveRef = useRef(isActive);
  const [isDragging, setIsDragging] = useState(false);
  const [centeredCardKey, setCenteredCardKey] = useState(initialKey);
  const [centeredSlug, setCenteredSlug] = useState(shootings[0]?.slug ?? '');
  const [isActionAvailable, setIsActionAvailable] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const slides = useMemo(
    () =>
      shootings.map((shooting) => ({ shooting, cover: getCover(shooting) })),
    [shootings],
  );

  const persistPosition = useCallback(() => {
    window.sessionStorage.setItem(POSITION_KEY, String(currentXRef.current));
  }, []);

  const normalizePosition = useCallback(() => {
    const setWidth = setWidthRef.current;
    const viewport = viewportRef.current;
    if (!setWidth || !viewport) return;
    const rangeStart = setWidth * MIDDLE_SET_INDEX;
    const rangeEnd = rangeStart + setWidth;
    let contentCenter = currentXRef.current + viewport.clientWidth / 2;
    while (contentCenter < rangeStart) {
      currentXRef.current += setWidth;
      targetXRef.current += setWidth;
      contentCenter += setWidth;
    }
    while (contentCenter >= rangeEnd) {
      currentXRef.current -= setWidth;
      targetXRef.current -= setWidth;
      contentCenter -= setWidth;
    }
  }, []);

  const updateVisuals = useCallback(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track) return;

    track.style.transform = `translate3d(${-currentXRef.current}px, 0, 0)`;

    const viewportCenter = currentXRef.current + viewport.clientWidth / 2;
    const viewportStart = currentXRef.current;
    const viewportEnd = viewportStart + viewport.clientWidth;
    const influenceRange = viewport.clientWidth * 0.64;
    let nearest: CardMetric | undefined;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const metric of metricsRef.current) {
      const distance = metric.center - viewportCenter;
      const isActive =
        metric.center + metric.halfWidth >= viewportStart - influenceRange &&
        metric.center - metric.halfWidth <= viewportEnd + influenceRange;

      if (metric.isActive !== isActive) {
        metric.isActive = isActive;
        metric.image.style.willChange = isActive ? 'transform' : 'auto';
      }

      const ratio = Math.max(
        -1,
        Math.min(1, distance / Math.max(1, influenceRange)),
      );
      const shift =
        isActive && !prefersReducedMotion ? -ratio * metric.maxImageShift : 0;
      if (
        !Number.isFinite(metric.lastShift) ||
        Math.abs(shift - metric.lastShift) > 0.35
      ) {
        metric.lastShift = shift;
        metric.image.style.transform = `translate3d(${shift.toFixed(2)}px, 0, 0) scale(${CARD_IMAGE_PARALLAX_SCALE})`;
      }

      if (Math.abs(distance) < nearestDistance) {
        nearest = metric;
        nearestDistance = Math.abs(distance);
      }
    }

    if (nearest) {
      if (centeredCardKeyRef.current !== nearest.key) {
        centeredCardKeyRef.current = nearest.key;
        setCenteredCardKey(nearest.key);
        const slug = nearest.element.dataset.shootingSlug;
        if (slug && isActiveRef.current) {
          onActiveItemChange(slug, nearest.key);
        }
      }

      const actionAvailable = nearestDistance <= nearest.halfWidth;
      if (actionAvailableRef.current !== actionAvailable) {
        actionAvailableRef.current = actionAvailable;
        setIsActionAvailable(actionAvailable);
      }

      const slug = nearest.element.dataset.shootingSlug;
      if (slug && centeredSlugRef.current !== slug) {
        centeredSlugRef.current = slug;
        setCenteredSlug(slug);
      }
    }
  }, [onActiveItemChange, prefersReducedMotion]);

  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  const runAnimation = useCallback(() => {
    const distance = targetXRef.current - currentXRef.current;
    if (Math.abs(distance) <= 0.15) {
      currentXRef.current = targetXRef.current;
      focusAnimationRef.current = false;
      normalizePosition();
      updateVisuals();
      persistPosition();
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
  }, [normalizePosition, persistPosition, updateVisuals]);

  const startAnimation = useCallback(() => {
    if (animationRef.current === null) {
      animationRef.current = window.requestAnimationFrame(runAnimation);
    }
  }, [runAnimation]);

  const markUsed = useCallback(() => {
    if (hasUsedGalleryRef.current) return;
    hasUsedGalleryRef.current = true;
    setShowHint(false);
    window.sessionStorage.setItem(HINT_KEY, 'true');
  }, []);

  const focusCard = useCallback(
    (card: HTMLElement) => {
      const viewport = viewportRef.current;
      if (!viewport) return;
      focusAnimationRef.current = true;
      targetXRef.current =
        card.offsetLeft + card.offsetWidth / 2 - viewport.clientWidth / 2;
      if (prefersReducedMotion) {
        currentXRef.current = targetXRef.current;
        normalizePosition();
        updateVisuals();
        persistPosition();
        return;
      }
      startAnimation();
    },
    [
      normalizePosition,
      persistPosition,
      prefersReducedMotion,
      startAnimation,
      updateVisuals,
    ],
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
    [focusCard, markUsed, router],
  );

  useEffect(() => {
    const hasUsedGallery = window.sessionStorage.getItem(HINT_KEY) === 'true';
    hasUsedGalleryRef.current = hasUsedGallery;
    // Session storage is an external browser source and is only available after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShowHint(!hasUsedGallery);
    const firstSet = firstSetRef.current;
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!firstSet || !viewport || !track) return;

    const measure = () => {
      // offsetWidth reflects the logical flex layout. scrollWidth also includes
      // Motion's temporary projection overflow while switching orientations.
      const previousSetWidth = setWidthRef.current;
      setWidthRef.current = firstSet.offsetWidth;
      metricsRef.current = Array.from(
        track.querySelectorAll<HTMLElement>('[data-gallery-card]'),
      )
        .map((element) => {
          const image = element.querySelector('img');
          return image
            ? {
                element,
                image,
                key: element.dataset.galleryKey ?? '',
                center: element.offsetLeft + element.offsetWidth / 2,
                halfWidth: element.offsetWidth / 2,
                maxImageShift: getSafeParallaxShift(
                  element.offsetWidth,
                  CARD_IMAGE_PARALLAX_SCALE,
                  CARD_IMAGE_PARALLAX_MAX_SHIFT_PX,
                ),
                lastShift: Number.NaN,
                isActive: false,
              }
            : null;
        })
        .filter((metric): metric is CardMetric => metric !== null);

      const stored = Number(window.sessionStorage.getItem(POSITION_KEY));
      const firstCard = firstSet.querySelector<HTMLElement>(
        '[data-gallery-card]',
      );
      if (!hasPositionedRef.current) {
        const preferredCard = track.querySelector<HTMLElement>(
          `[data-gallery-key="${initialKeyRef.current}"]`,
        );
        const initial =
          preferInitialItemRef.current && preferredCard
            ? preferredCard.offsetLeft +
              preferredCard.offsetWidth / 2 -
              viewport.clientWidth / 2
            : Number.isFinite(stored) && stored > 0
              ? stored
              : setWidthRef.current * MIDDLE_SET_INDEX +
                (firstCard?.offsetWidth ?? 0) / 2 -
                viewport.clientWidth / 2;
        currentXRef.current = initial;
        targetXRef.current = initial;
        hasPositionedRef.current = true;
      } else if (Math.abs(previousSetWidth - setWidthRef.current) > 0.5) {
        const centeredCard = track.querySelector<HTMLElement>(
          `[data-gallery-key="${centeredCardKeyRef.current}"]`,
        );
        if (centeredCard) {
          const centeredPosition =
            centeredCard.offsetLeft +
            centeredCard.offsetWidth / 2 -
            viewport.clientWidth / 2;
          currentXRef.current = centeredPosition;
          targetXRef.current = centeredPosition;
        }
      }
      normalizePosition();
      updateVisuals();
      viewport.dataset.galleryReady = 'true';
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(firstSet);
    window.addEventListener('resize', measure);
    return () => {
      delete viewport.dataset.galleryReady;
      observer.disconnect();
      window.removeEventListener('resize', measure);
      if (animationRef.current !== null) {
        window.cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      persistPosition();
    };
  }, [normalizePosition, persistPosition, slides, updateVisuals]);

  useLayoutEffect(() => {
    if (isActive || isTransitioning) return;
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track || !setWidthRef.current) return;
    const preferredCard = track.querySelector<HTMLElement>(
      `[data-gallery-key="${initialKey}"]`,
    );
    if (!preferredCard) return;
    const position =
      preferredCard.offsetLeft +
      preferredCard.offsetWidth / 2 -
      viewport.clientWidth / 2;
    currentXRef.current = position;
    targetXRef.current = position;
    normalizePosition();
    updateVisuals();
  }, [initialKey, isActive, isTransitioning, normalizePosition, updateVisuals]);

  const handleWheel = useCallback(
    (event: globalThis.WheelEvent) => {
      const viewportWidth =
        viewportRef.current?.clientWidth ?? window.innerWidth;
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
    },
    [markUsed, startAnimation],
  );

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    viewport.addEventListener('wheel', handleWheel, { passive: false });
    return () => viewport.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!supportsPointer(event) || !viewportRef.current) return;
    activePointerRef.current = event.pointerId;
    activePointerTypeRef.current = event.pointerType;
    dragThresholdRef.current =
      event.pointerType === 'mouse'
        ? DRAG_CLICK_THRESHOLD
        : TOUCH_DRAG_CLICK_THRESHOLD;
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
    if (Math.abs(dragDelta) >= dragThresholdRef.current)
      draggedRef.current = true;
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
      const momentum =
        activePointerTypeRef.current === 'mouse'
          ? POINTER_RELEASE_MOMENTUM
          : TOUCH_RELEASE_MOMENTUM;
      targetXRef.current =
        currentXRef.current +
        Math.max(-1500, Math.min(1500, velocity * momentum));
      startAnimation();
      return;
    }

    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      return;

    const card = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>('[data-gallery-card]');
    if (card) {
      skipNextClickRef.current = true;
      window.setTimeout(() => {
        skipNextClickRef.current = false;
      });
      activateCard(card);
    }
  };

  const onCardClick = (
    event: ReactMouseEvent<HTMLAnchorElement>,
    card: HTMLElement,
  ) => {
    if (skipNextClickRef.current || draggedRef.current) {
      event.preventDefault();
      skipNextClickRef.current = false;
      return;
    }
    if (event.detail === 0) {
      markUsed();
      return;
    }
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    const viewport = viewportRef.current;
    if (!viewport) return;
    const viewportRect = viewport.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const delta = Math.abs(
      cardRect.left +
        cardRect.width / 2 -
        (viewportRect.left + viewportRect.width / 2),
    );
    if (delta > CENTER_THRESHOLD) {
      event.preventDefault();
      card.focus({ preventScroll: true });
      focusCard(card);
      markUsed();
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>, card: HTMLElement) => {
    const isDirectional =
      event.key === 'ArrowLeft' || event.key === 'ArrowRight';
    if (!isDirectional && event.key !== 'Home' && event.key !== 'End') return;
    event.preventDefault();
    const direction = event.key === 'ArrowRight' ? 1 : -1;
    const nextIndex =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? slides.length - 1
          : (Number(card.dataset.slideIndex) + direction + slides.length) %
            slides.length;
    const nextCard = trackRef.current?.querySelector<HTMLElement>(
      `[data-set-index="${MIDDLE_SET_INDEX}"][data-slide-index="${nextIndex}"]`,
    );
    if (nextCard) {
      nextCard.focus({ preventScroll: true });
      focusCard(nextCard);
    }
  };

  return (
    <section
      id="index-gallery-horizontal"
      className={`index-gallery ${isDragging ? 'is-dragging' : ''}`}
      aria-label={messages[language].indexGallery}
      aria-roledescription={messages[language].carousel}
      aria-describedby="index-gallery-instructions"
    >
      <div
        ref={viewportRef}
        className="index-gallery__viewport"
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
              {slides.map(({ shooting, cover }, slideIndex) => {
                const galleryKey = `${setIndex}-${slideIndex}`;
                return (
                  <Link
                    key={`${setIndex}-${shooting.id}-${slideIndex}`}
                    href={`/shoots/${shooting.slug}`}
                    tabIndex={
                      isActive &&
                      setIndex === MIDDLE_SET_INDEX &&
                      centeredCardKey === galleryKey
                        ? 0
                        : -1
                    }
                    className={`index-gallery__card ${centeredCardKey === galleryKey ? 'is-centered' : ''}`}
                    data-gallery-card
                    data-gallery-key={galleryKey}
                    data-set-index={setIndex}
                    data-slide-index={slideIndex}
                    data-shooting-slug={shooting.slug}
                    aria-label={`${shooting.title}, ${shooting.year}, ${messages[language].itemPosition(slideIndex + 1, slides.length)}`}
                    onClick={(event) => {
                      onCardClick(event, event.currentTarget);
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
                      sizes="(max-width: 760px) 76vw, (max-width: 1024px) 52vw, 440px"
                      quality={68}
                      loading={
                        isActive && setIndex === MIDDLE_SET_INDEX
                          ? 'eager'
                          : 'lazy'
                      }
                      fetchPriority={
                        isActive &&
                        setIndex === MIDDLE_SET_INDEX &&
                        galleryKey === centeredCardKey
                          ? 'high'
                          : 'auto'
                      }
                      decoding="async"
                      draggable={false}
                    />
                    <span className="index-gallery__caption">
                      <span>{shooting.title}</span>
                      <span>
                        {shooting.year}
                        <span className="index-gallery__caption-open">
                          {' / '}
                          {messages[language].open}
                        </span>
                      </span>
                    </span>
                  </Link>
                );
              })}
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
    </section>
  );
}

export function IndexGallery({ shootings }: IndexGalleryProps) {
  const { language } = useLanguage();
  const {
    mode,
    revision,
    isTransitioning,
    activeItem: persistedActiveItem,
    completeTransition,
    setActiveItem,
  } = useIndexView();
  const prefersReducedMotion = useReducedMotion();
  const persistedIndex = shootings.findIndex(
    (shooting) => shooting.slug === persistedActiveItem?.slug,
  );
  const activeItem =
    persistedIndex >= 0
      ? {
          slug: shootings[persistedIndex]?.slug ?? '',
          key: `${MIDDLE_SET_INDEX}-${persistedIndex}`,
        }
      : {
          slug: shootings[0]?.slug ?? '',
          key: `${MIDDLE_SET_INDEX}-0`,
        };
  const [transitionCards, setTransitionCards] = useState<TransitionCard[]>([]);
  const isSwitchingModeRef = useRef(isTransitioning);
  const previousModeRef = useRef(mode);
  const stageRef = useRef<HTMLDivElement>(null);
  const activeIndex = Math.max(
    0,
    shootings.findIndex((shooting) => shooting.slug === activeItem.slug),
  );
  const previousShooting =
    shootings[(activeIndex - 1 + shootings.length) % shootings.length];
  const nextShooting = shootings[(activeIndex + 1) % shootings.length];

  useEffect(() => {
    isSwitchingModeRef.current = isTransitioning;
    if (!isTransitioning) return;
    const timeout = window.setTimeout(
      () => completeTransition(revision),
      prefersReducedMotion ? 160 : 1050,
    );
    return () => window.clearTimeout(timeout);
  }, [completeTransition, isTransitioning, prefersReducedMotion, revision]);

  useEffect(() => {
    if (!isTransitioning) return;
    const finishOnResize = () => completeTransition(revision);
    window.addEventListener('resize', finishOnResize, { once: true });
    return () => window.removeEventListener('resize', finishOnResize);
  }, [completeTransition, isTransitioning, revision]);

  const handleActiveItemChange = useCallback(
    (slug: string, key: string) => {
      if (isSwitchingModeRef.current) return;
      const slideIndex = Number(key.split('-')[1]);
      const canonicalKey = `${MIDDLE_SET_INDEX}-${Number.isFinite(slideIndex) ? slideIndex : 0}`;
      setActiveItem({ slug, key: canonicalKey });
    },
    [setActiveItem],
  );

  useLayoutEffect(() => {
    const previousMode = previousModeRef.current;
    if (previousMode === mode || !isTransitioning) return;
    const stage = stageRef.current;
    const sourceLayer = stage?.querySelector<HTMLElement>(
      `[data-index-view="${previousMode}"]`,
    );
    const targetLayer = stage?.querySelector<HTMLElement>(
      `[data-index-view="${mode}"]`,
    );
    const sourceCards = Array.from(
      sourceLayer?.querySelectorAll<HTMLElement>('[data-gallery-card]') ?? [],
    );
    const targetCards = Array.from(
      targetLayer?.querySelectorAll<HTMLElement>('[data-gallery-card]') ?? [],
    );
    const sourceCenter = sourceLayer?.querySelector<HTMLElement>(
      '[data-gallery-card].is-centered',
    );
    const targetCenter =
      targetLayer?.querySelector<HTMLElement>(
        '[data-gallery-card].is-centered',
      ) ??
      targetLayer?.querySelector<HTMLElement>(
        `[data-gallery-key="${activeItem.key}"]`,
      );
    const sourceCenterIndex = sourceCenter
      ? sourceCards.indexOf(sourceCenter)
      : -1;
    const targetCenterIndex = targetCenter
      ? targetCards.indexOf(targetCenter)
      : -1;
    const nextCards: TransitionCard[] = [];

    if (sourceCenterIndex >= 0 && targetCenterIndex >= 0) {
      for (
        let offset = -TRANSITION_CARD_RADIUS;
        offset <= TRANSITION_CARD_RADIUS;
        offset += 1
      ) {
        const source = sourceCards[sourceCenterIndex + offset];
        const target = targetCards[targetCenterIndex + offset];
        const sourceImage = source?.querySelector<HTMLImageElement>('img');
        const targetImage = target?.querySelector<HTMLImageElement>('img');
        if (!source || !target || !sourceImage || !targetImage) continue;
        const sourceRect = source.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        nextCards.push({
          key: `${revision}-${offset}`,
          src: sourceImage.currentSrc || sourceImage.src,
          from: {
            left: sourceRect.left,
            top: sourceRect.top,
            width: sourceRect.width,
            height: sourceRect.height,
          },
          to: {
            left: targetRect.left,
            top: targetRect.top,
            width: targetRect.width,
            height: targetRect.height,
          },
          fromImage: getImageTransform(sourceImage),
          toImage: getImageTransform(targetImage),
        });
      }
    }

    // Both persistent galleries are measured before the browser paints the new mode.
    setTransitionCards(nextCards);
    previousModeRef.current = mode;
  }, [activeItem.key, isTransitioning, mode, revision]);

  const moveGallerySelection = (direction: -1 | 1) => {
    const activeView = stageRef.current?.querySelector<HTMLElement>(
      `.index-gallery-view[data-index-view="${mode}"].is-active`,
    );
    const currentCard =
      activeView?.querySelector<HTMLElement>(
        `[data-set-index="${MIDDLE_SET_INDEX}"][data-gallery-card].is-centered`,
      ) ??
      activeView?.querySelector<HTMLElement>(
        `[data-set-index="${MIDDLE_SET_INDEX}"][data-gallery-card][tabindex="0"]`,
      );
    if (!currentCard) return;
    currentCard.dispatchEvent(
      new KeyboardEvent('keydown', {
        key:
          mode === 'horizontal'
            ? direction > 0
              ? 'ArrowRight'
              : 'ArrowLeft'
            : direction > 0
              ? 'ArrowDown'
              : 'ArrowUp',
        bubbles: true,
      }),
    );
  };

  return (
    <main id="main-content" className="index-page" tabIndex={-1}>
      <h1 className="sr-only">{messages[language].index}</h1>
      <p id="index-gallery-instructions" className="sr-only">
        {messages[language].indexInstructions}
      </p>
      <div
        ref={stageRef}
        className={`index-gallery-stage ${isTransitioning && transitionCards.length > 0 ? 'has-transition-cards' : ''}`}
        data-index-view={mode}
        data-index-revision={revision}
        data-index-transitioning={isTransitioning ? 'true' : 'false'}
      >
        <div
          className={`index-gallery-view ${mode === 'horizontal' ? 'is-active' : ''} ${mode !== 'horizontal' && isTransitioning ? 'is-transition-source' : ''} ${isTransitioning ? 'is-transitioning' : ''}`}
          data-index-view="horizontal"
          aria-hidden={mode !== 'horizontal'}
          inert={mode !== 'horizontal'}
        >
          <HorizontalIndexGallery
            shootings={shootings}
            initialKey={activeItem.key}
            onActiveItemChange={handleActiveItemChange}
            preferInitialItem={revision > 0}
            isActive={mode === 'horizontal'}
            isTransitioning={isTransitioning}
          />
        </div>

        <div
          className={`index-gallery-view ${mode === 'vertical' ? 'is-active' : ''} ${mode !== 'vertical' && isTransitioning ? 'is-transition-source' : ''} ${isTransitioning ? 'is-transitioning' : ''}`}
          data-index-view="vertical"
          aria-hidden={mode !== 'vertical'}
          inert={mode !== 'vertical'}
        >
          <VerticalIndexGallery
            shootings={shootings}
            initialKey={activeItem.key}
            onActiveItemChange={handleActiveItemChange}
            isActive={mode === 'vertical'}
            isTransitioning={isTransitioning}
          />
        </div>

        {isTransitioning && transitionCards.length > 0 ? (
          <div className="index-gallery-transition" aria-hidden="true">
            {transitionCards.map((card) => (
              <motion.div
                key={card.key}
                className="index-gallery-transition__card"
                initial={{
                  left: card.from.left,
                  top: card.from.top,
                  width: card.from.width,
                  height: card.from.height,
                }}
                animate={{
                  left: card.to.left,
                  top: card.to.top,
                  width: card.to.width,
                  height: card.to.height,
                }}
                transition={{
                  duration: prefersReducedMotion
                    ? PUBLIC_MOTION.reduced
                    : PUBLIC_MOTION.layout,
                  ease: PUBLIC_MOTION.easeLayout,
                }}
              >
                <motion.div
                  className="index-gallery-transition__image"
                  style={{ backgroundImage: `url("${card.src}")` }}
                  initial={card.fromImage}
                  animate={card.toImage}
                  transition={{
                    duration: prefersReducedMotion
                      ? PUBLIC_MOTION.reduced
                      : PUBLIC_MOTION.layout,
                    ease: PUBLIC_MOTION.easeLayout,
                  }}
                />
              </motion.div>
            ))}
          </div>
        ) : null}
      </div>

      {shootings.length > 1 ? (
        <div className="index-gallery-controls">
          <button
            type="button"
            aria-controls={`index-gallery-${mode}`}
            aria-label={`${messages[language].previousIndexItem}: ${previousShooting?.title ?? ''}`}
            disabled={isTransitioning}
            onClick={() => moveGallerySelection(-1)}
          >
            <span aria-hidden="true">←</span>
          </button>
          <button
            type="button"
            aria-controls={`index-gallery-${mode}`}
            aria-label={`${messages[language].nextIndexItem}: ${nextShooting?.title ?? ''}`}
            disabled={isTransitioning}
            onClick={() => moveGallerySelection(1)}
          >
            <span aria-hidden="true">→</span>
          </button>
        </div>
      ) : null}
    </main>
  );
}
