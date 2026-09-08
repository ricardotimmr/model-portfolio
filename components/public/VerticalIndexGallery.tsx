'use client';

import { AnimatePresence, motion } from 'motion/react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { useLanguage } from '@/components/providers/LanguageProvider';
import type { Shooting } from '@/lib/content';
import { getCover } from '@/lib/content';
import { messages } from '@/lib/i18n';

type VerticalIndexGalleryProps = {
  shootings: Shooting[];
  initialKey: string;
  onActiveItemChange: (slug: string, key: string) => void;
  isActive: boolean;
  isTransitioning: boolean;
};

const REPEATED_SET_COUNT = 5;
const MIDDLE_SET_INDEX = Math.floor(REPEATED_SET_COUNT / 2);
const HINT_KEY = 'model-portfolio:gallery-used';
const CENTER_THRESHOLD = 6;
const IMAGE_PARALLAX_MAX_SHIFT_PX = 86;
const IMAGE_PARALLAX_SCALE = 1.3;

function getSlideIndex(key: string, shootingCount: number) {
  const value = Number(key.split('-')[1]);
  return Number.isFinite(value) && value >= 0 && value < shootingCount
    ? value
    : 0;
}

export function VerticalIndexGallery({
  shootings,
  initialKey,
  onActiveItemChange,
  isActive,
  isTransitioning,
}: VerticalIndexGalleryProps) {
  const router = useRouter();
  const { language } = useLanguage();
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const firstSetRef = useRef<HTMLDivElement>(null);
  const setHeightRef = useRef(0);
  const animationRef = useRef<number | null>(null);
  const activeKeyRef = useRef(initialKey);
  const hasPositionedRef = useRef(false);
  const hasUsedGalleryRef = useRef(false);
  const isActiveRef = useRef(isActive);
  const initialKeyRef = useRef(initialKey);
  const initialIndexRef = useRef(getSlideIndex(initialKey, shootings.length));
  const [activeKey, setActiveKey] = useState(initialKey);
  const [activeIndex, setActiveIndex] = useState(() =>
    getSlideIndex(initialKey, shootings.length),
  );
  const [direction, setDirection] = useState(1);
  const [showHint, setShowHint] = useState(false);

  const markUsed = useCallback(() => {
    if (hasUsedGalleryRef.current) return;
    hasUsedGalleryRef.current = true;
    setShowHint(false);
    window.sessionStorage.setItem(HINT_KEY, 'true');
  }, []);

  const normalizePosition = useCallback(() => {
    const viewport = viewportRef.current;
    const setHeight = setHeightRef.current;
    if (!viewport || !setHeight) return;

    let next = viewport.scrollTop;
    const rangeStart = setHeight * MIDDLE_SET_INDEX;
    const rangeEnd = rangeStart + setHeight;
    let contentCenter = next + viewport.clientHeight / 2;
    while (contentCenter < rangeStart) {
      next += setHeight;
      contentCenter += setHeight;
    }
    while (contentCenter >= rangeEnd) {
      next -= setHeight;
      contentCenter -= setHeight;
    }
    if (Math.abs(next - viewport.scrollTop) > 0.5) viewport.scrollTop = next;
  }, []);

  const updateVisuals = useCallback(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track) return;

    normalizePosition();
    const viewportRect = viewport.getBoundingClientRect();
    const viewportCenter = viewportRect.top + viewportRect.height / 2;
    const influenceRange = viewportRect.height * 0.68;
    const cards = Array.from(
      track.querySelectorAll<HTMLElement>('[data-gallery-card]'),
    );
    let nearest: HTMLElement | undefined;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const card of cards) {
      const image = card.querySelector<HTMLImageElement>('img');
      if (!image) continue;
      const rect = card.getBoundingClientRect();
      const distance = rect.top + rect.height / 2 - viewportCenter;
      const isNear = Math.abs(distance) <= influenceRange + rect.height / 2;
      const ratio = Math.max(
        -1,
        Math.min(1, distance / Math.max(1, influenceRange)),
      );
      const shift = isNear ? -ratio * IMAGE_PARALLAX_MAX_SHIFT_PX : 0;
      image.style.willChange = isNear ? 'transform' : 'auto';
      image.style.transform = `translate3d(0, ${shift.toFixed(2)}px, 0) scale(${IMAGE_PARALLAX_SCALE})`;

      if (Math.abs(distance) < nearestDistance) {
        nearest = card;
        nearestDistance = Math.abs(distance);
      }
    }

    if (!nearest) return;
    const key = nearest.dataset.galleryKey ?? '';
    const nextIndex = Number(nearest.dataset.slideIndex);
    const slug = nearest.dataset.shootingSlug;
    if (!key || !slug || !Number.isFinite(nextIndex)) return;

    if (activeKeyRef.current !== key) {
      const previous = activeKeyRef.current.split('-').map(Number);
      const next = key.split('-').map(Number);
      const previousOrdinal = previous[0] * shootings.length + previous[1];
      const nextOrdinal = next[0] * shootings.length + next[1];
      if (Number.isFinite(previousOrdinal) && Number.isFinite(nextOrdinal)) {
        setDirection(nextOrdinal >= previousOrdinal ? 1 : -1);
      }
      activeKeyRef.current = key;
      setActiveKey(key);
      setActiveIndex(nextIndex);
      if (isActiveRef.current) onActiveItemChange(slug, key);
    }
  }, [normalizePosition, onActiveItemChange, shootings.length]);

  useLayoutEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  const requestUpdate = useCallback(() => {
    if (animationRef.current !== null) return;
    animationRef.current = window.requestAnimationFrame(() => {
      animationRef.current = null;
      updateVisuals();
    });
  }, [updateVisuals]);

  const centerCard = useCallback(
    (card: HTMLElement, behavior: ScrollBehavior) => {
      const viewport = viewportRef.current;
      if (!viewport) return;
      viewport.scrollTo({
        top: card.offsetTop + card.offsetHeight / 2 - viewport.clientHeight / 2,
        behavior,
      });
    },
    [],
  );

  const activateCard = useCallback(
    (card: HTMLElement) => {
      const viewport = viewportRef.current;
      if (!viewport) return;
      const viewportRect = viewport.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();
      const delta = Math.abs(
        cardRect.top +
          cardRect.height / 2 -
          (viewportRect.top + viewportRect.height / 2),
      );
      if (delta <= CENTER_THRESHOLD) {
        const slug = card.dataset.shootingSlug;
        if (slug) router.push(`/shoots/${slug}`);
      } else {
        centerCard(card, 'smooth');
      }
      markUsed();
    },
    [centerCard, markUsed, router],
  );

  useLayoutEffect(() => {
    // Session storage is an external browser source and is only available after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShowHint(window.sessionStorage.getItem(HINT_KEY) !== 'true');
    const firstSet = firstSetRef.current;
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!firstSet || !viewport || !track) return;

    const measure = () => {
      setHeightRef.current = firstSet.offsetHeight;
      if (!hasPositionedRef.current) {
        const preferred = track.querySelector<HTMLElement>(
          `[data-gallery-key="${initialKeyRef.current}"]`,
        );
        const fallback = track.querySelector<HTMLElement>(
          `[data-set-index="${MIDDLE_SET_INDEX}"][data-slide-index="${initialIndexRef.current}"]`,
        );
        const card = preferred ?? fallback;
        if (card) centerCard(card, 'auto');
        hasPositionedRef.current = true;
      }
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
    };
  }, [centerCard, updateVisuals]);

  useLayoutEffect(() => {
    if (isActive || isTransitioning) return;
    const track = trackRef.current;
    if (!track || !setHeightRef.current) return;
    const preferred = track.querySelector<HTMLElement>(
      `[data-gallery-key="${initialKey}"]`,
    );
    if (!preferred) return;
    centerCard(preferred, 'auto');
    updateVisuals();
  }, [centerCard, initialKey, isActive, isTransitioning, updateVisuals]);

  const onScroll = () => {
    markUsed();
    requestUpdate();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>, card: HTMLElement) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      activateCard(card);
      return;
    }
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    event.preventDefault();
    const direction = event.key === 'ArrowDown' ? 1 : -1;
    const nextIndex =
      (Number(card.dataset.slideIndex) + direction + shootings.length) %
      shootings.length;
    const nextCard = trackRef.current?.querySelector<HTMLElement>(
      `[data-set-index="${MIDDLE_SET_INDEX}"][data-slide-index="${nextIndex}"]`,
    );
    if (nextCard) {
      nextCard.focus();
      centerCard(nextCard, 'smooth');
    }
  };

  const activeShooting = shootings[activeIndex] ?? shootings[0];

  return (
    <main
      id={isActive ? 'main-content' : undefined}
      className="index-gallery index-gallery--vertical"
    >
      <motion.div
        ref={viewportRef}
        className="vertical-gallery__viewport"
        layoutScroll
        onScroll={onScroll}
      >
        <div ref={trackRef} className="vertical-gallery__track">
          {Array.from({ length: REPEATED_SET_COUNT }, (_, setIndex) => (
            <div
              ref={setIndex === 0 ? firstSetRef : undefined}
              className="vertical-gallery__set"
              key={setIndex}
              aria-hidden={setIndex !== MIDDLE_SET_INDEX}
            >
              {shootings.map((shooting, slideIndex) => {
                const cover = getCover(shooting);
                const galleryKey = `${setIndex}-${slideIndex}`;
                return (
                  <motion.article
                    key={`${setIndex}-${shooting.id}-${slideIndex}`}
                    tabIndex={
                      isActive && setIndex === MIDDLE_SET_INDEX ? 0 : -1
                    }
                    className={`index-gallery__card vertical-gallery__card ${activeKey === galleryKey ? 'is-centered' : ''}`}
                    data-gallery-card
                    data-gallery-key={galleryKey}
                    data-set-index={setIndex}
                    data-slide-index={slideIndex}
                    data-shooting-slug={shooting.slug}
                    aria-label={`${shooting.title}, ${shooting.year}`}
                    role="link"
                    onClick={(event) => activateCard(event.currentTarget)}
                    onKeyDown={(event) => onKeyDown(event, event.currentTarget)}
                  >
                    <Image
                      className="index-gallery__image vertical-gallery__image"
                      src={cover.src}
                      width={cover.width}
                      height={cover.height}
                      alt={
                        setIndex === MIDDLE_SET_INDEX ? cover.alt[language] : ''
                      }
                      sizes="(max-width: 760px) 86vw, (max-width: 1200px) 46vw, 600px"
                      quality={68}
                      loading={setIndex === MIDDLE_SET_INDEX ? 'eager' : 'lazy'}
                      decoding="async"
                      draggable={false}
                    />
                    <span className="index-gallery__caption">
                      <span>{shooting.title}</span>
                      <span>{shooting.year}</span>
                    </span>
                  </motion.article>
                );
              })}
            </div>
          ))}
        </div>
      </motion.div>

      {activeShooting ? (
        <div className="vertical-gallery__metadata" aria-live="polite">
          <div className="vertical-gallery__panel vertical-gallery__panel--title">
            <AnimatePresence
              initial={false}
              custom={direction}
              mode="popLayout"
            >
              <motion.p
                key={activeShooting.slug}
                custom={direction}
                initial={{ y: direction * 22, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: direction * -22, opacity: 0 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              >
                {activeShooting.title}
              </motion.p>
            </AnimatePresence>
          </div>
          <div className="vertical-gallery__panel vertical-gallery__panel--description">
            <AnimatePresence
              initial={false}
              custom={direction}
              mode="popLayout"
            >
              <motion.p
                key={activeShooting.slug}
                custom={direction}
                initial={{ y: direction * 18, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: direction * -18, opacity: 0 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              >
                {activeShooting.description?.[language]}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>
      ) : null}

      <div className="index-gallery__action is-visible" aria-hidden="true">
        <span>{messages[language].open}</span>
        <span className="index-gallery__action-title">
          {activeShooting?.title}
        </span>
      </div>
      {showHint ? (
        <p className="index-gallery__hint vertical-gallery__hint">
          ↑ {messages[language].scroll} ↓
        </p>
      ) : null}
    </main>
  );
}
