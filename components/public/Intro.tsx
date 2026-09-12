'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { usePathname } from 'next/navigation';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { PUBLIC_MOTION } from '@/lib/public-motion';

const SESSION_KEY = 'model-portfolio:intro-played:v3';
const TILE_COUNT = 5;
const LOADER_SIZE = 10;
const LOADER_GAP = 9;
const LOAD_STEP_MS = 110;
const GALLERY_READY_TIMEOUT_MS = 2400;
const IMAGE_READY_TIMEOUT_MS = 1400;
const EXPAND_DURATION_MS = 1200;
const SETTLE_DURATION_MS = 180;
const RESIZE_SETTLE_MS = 140;

type IntroPhase = 'loading' | 'expanding' | 'revealing';

type IntroTile = {
  id: number;
  startLeft: number;
  startTop: number;
  targetLeft: number;
  targetTop: number;
  targetWidth: number;
  targetHeight: number;
  imageSrc?: string;
  imageFilter?: string;
  imageObjectFit?: string;
  imageObjectPosition?: string;
  imageTransform?: string;
  imageTransformOrigin?: string;
};

const wait = (milliseconds: number) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));

const waitForPaint = () =>
  new Promise<void>((resolve) =>
    window.requestAnimationFrame(() =>
      window.requestAnimationFrame(() => resolve()),
    ),
  );

function createLoadingTiles(): IntroTile[] {
  const totalWidth = TILE_COUNT * LOADER_SIZE + (TILE_COUNT - 1) * LOADER_GAP;
  const startLeft = window.innerWidth / 2 - totalWidth / 2;
  const startTop = window.innerHeight / 2 - LOADER_SIZE / 2;

  return Array.from({ length: TILE_COUNT }, (_, index) => {
    const left = startLeft + index * (LOADER_SIZE + LOADER_GAP);
    return {
      id: index,
      startLeft: left,
      startTop,
      targetLeft: left,
      targetTop: startTop,
      targetWidth: LOADER_SIZE,
      targetHeight: LOADER_SIZE,
    };
  });
}

function getGalleryTargets(loadingTiles: IntroTile[]): {
  tiles: IntroTile[];
  images: HTMLImageElement[];
} | null {
  const viewport = document.querySelector<HTMLElement>(
    '[data-gallery-ready="true"]',
  );
  if (!viewport) return null;

  const cards = Array.from(
    viewport.querySelectorAll<HTMLElement>('[data-gallery-card]'),
  )
    .map((card) => {
      const rect = card.getBoundingClientRect();
      return {
        card,
        rect,
        distance: Math.abs(rect.left + rect.width / 2 - window.innerWidth / 2),
      };
    })
    .filter(({ rect }) => rect.width > 0 && rect.height > 0)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, TILE_COUNT)
    .sort((a, b) => a.rect.left - b.rect.left);

  if (cards.length !== TILE_COUNT) return null;

  const images: HTMLImageElement[] = [];
  const tiles = cards.map(({ card, rect }, index) => {
    const image = card.querySelector<HTMLImageElement>('img');
    const computed = image ? window.getComputedStyle(image) : null;

    // `image.src` is Next Image's largest fallback candidate. Waiting for
    // `currentSrc` prevents the intro clone from accidentally requesting it
    // before the browser has selected the responsive source.
    if (!image?.currentSrc) return null;
    images.push(image);

    return {
      ...loadingTiles[index]!,
      targetLeft: rect.left,
      targetTop: rect.top,
      targetWidth: rect.width,
      targetHeight: rect.height,
      imageSrc: image.currentSrc,
      imageFilter: computed?.filter,
      imageObjectFit: computed?.objectFit,
      imageObjectPosition: computed?.objectPosition,
      imageTransform: computed?.transform,
      imageTransformOrigin: computed?.transformOrigin,
    };
  });

  if (tiles.some((tile) => tile === null)) return null;

  return { tiles: tiles as IntroTile[], images };
}

async function waitForGalleryTargets(
  loadingTiles: IntroTile[],
  isCurrent: () => boolean,
) {
  const startedAt = performance.now();

  while (
    isCurrent() &&
    performance.now() - startedAt < GALLERY_READY_TIMEOUT_MS
  ) {
    const targets = getGalleryTargets(loadingTiles);
    if (targets) return targets;
    await new Promise<void>((resolve) =>
      window.requestAnimationFrame(() => resolve()),
    );
  }

  return null;
}

async function waitForImage(image: HTMLImageElement) {
  const ready =
    image.complete && image.naturalWidth > 0
      ? Promise.resolve()
      : image.decode().catch(() => undefined);

  await Promise.race([ready, wait(IMAGE_READY_TIMEOUT_MS)]);
}

function getImagePromises(images: HTMLImageElement[]) {
  const promisesBySource = new Map<string, Promise<void>>();

  return images.map((image) => {
    const source = image.currentSrc;
    const existing = promisesBySource.get(source);
    if (existing) return existing;

    const promise = waitForImage(image);
    promisesBySource.set(source, promise);
    return promise;
  });
}

export function Intro() {
  const pathname = usePathname();
  const prefersReducedMotion = useReducedMotion();
  const hasStartedRef = useRef(false);
  const sequenceRef = useRef(0);
  const viewportSizeRef = useRef({ width: 0, height: 0 });
  const resizeTimeoutRef = useRef<number | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [tiles, setTiles] = useState<IntroTile[]>([]);
  const [loadedCount, setLoadedCount] = useState(0);
  const [phase, setPhase] = useState<IntroPhase>('loading');
  const [layoutRevision, setLayoutRevision] = useState(0);

  useLayoutEffect(() => {
    if (pathname !== '/' || hasStartedRef.current) return;

    if (document.querySelector('[data-index-empty="true"]')) return;

    const hasPlayed = window.sessionStorage.getItem(SESSION_KEY) === 'true';
    if (hasPlayed) return;

    hasStartedRef.current = true;
    viewportSizeRef.current = {
      width: window.innerWidth,
      height: window.innerHeight,
    };
    window.sessionStorage.setItem(SESSION_KEY, 'true');
    // Session storage and viewport geometry are browser-only external sources.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTiles(createLoadingTiles());
    setLoadedCount(0);
    setPhase('loading');
    setIsVisible(true);
  }, [pathname]);

  useEffect(() => {
    if (!isVisible) return;

    const handleResize = () => {
      const widthChanged =
        Math.abs(window.innerWidth - viewportSizeRef.current.width) >= 2;
      const heightChanged =
        Math.abs(window.innerHeight - viewportSizeRef.current.height) >= 2;
      if (!widthChanged && !heightChanged) return;
      viewportSizeRef.current = {
        width: window.innerWidth,
        height: window.innerHeight,
      };
      sequenceRef.current += 1;
      if (resizeTimeoutRef.current !== null) {
        window.clearTimeout(resizeTimeoutRef.current);
      }
      resizeTimeoutRef.current = window.setTimeout(() => {
        resizeTimeoutRef.current = null;
        setTiles(createLoadingTiles());
        setLoadedCount(0);
        setPhase('loading');
        setLayoutRevision((current) => current + 1);
      }, RESIZE_SETTLE_MS);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeTimeoutRef.current !== null) {
        window.clearTimeout(resizeTimeoutRef.current);
        resizeTimeoutRef.current = null;
      }
    };
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible || tiles.length !== TILE_COUNT) return;

    const sequence = ++sequenceRef.current;
    const isCurrent = () => sequenceRef.current === sequence;

    const run = async () => {
      const targets = await waitForGalleryTargets(tiles, isCurrent);
      if (!targets || !isCurrent()) {
        if (isCurrent()) setIsVisible(false);
        return;
      }

      setTiles(targets.tiles);
      const imagePromises = getImagePromises(targets.images);

      for (let index = 0; index < TILE_COUNT; index += 1) {
        await Promise.all([imagePromises[index], wait(LOAD_STEP_MS)]);
        if (!isCurrent()) return;
        setLoadedCount(index + 1);
      }

      const finalTargets = getGalleryTargets(targets.tiles);
      if (!finalTargets || !isCurrent()) {
        if (isCurrent()) setIsVisible(false);
        return;
      }
      await Promise.all(getImagePromises(finalTargets.images));
      if (!isCurrent()) return;
      setTiles(finalTargets.tiles);
      // Commit the latest card geometry while the five loader squares remain
      // visually unchanged, then start the transform on the following paint.
      await waitForPaint();
      if (!isCurrent()) return;

      if (prefersReducedMotion) {
        setPhase('revealing');
        await wait(180);
      } else {
        await wait(90);
        if (!isCurrent()) return;
        setPhase('expanding');
        await wait(EXPAND_DURATION_MS);
        if (!isCurrent()) return;
        setPhase('revealing');
        await wait(SETTLE_DURATION_MS);
      }

      if (isCurrent()) setIsVisible(false);
    };

    void run();

    return () => {
      sequenceRef.current += 1;
    };
    // Tile geometry changes during this sequence without restarting it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible, layoutRevision, prefersReducedMotion]);

  const isExpanded = phase === 'expanding' || phase === 'revealing';

  return (
    <AnimatePresence>
      {isVisible ? (
        <motion.div
          className="intro"
          data-intro-phase={phase}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{
            duration: prefersReducedMotion
              ? PUBLIC_MOTION.reduced
              : PUBLIC_MOTION.feedback,
          }}
          aria-hidden="true"
        >
          {tiles.map((tile, index) => (
            <div
              className="intro__tile"
              data-intro-tile={tile.id}
              key={tile.id}
              style={{
                left: tile.targetLeft,
                top: tile.targetTop,
                width: tile.targetWidth,
                height: tile.targetHeight,
                borderColor: isExpanded ? 'rgba(17, 17, 17, 0)' : '#111111',
                transform: isExpanded
                  ? 'translate3d(0, 0, 0) scale(1, 1)'
                  : `translate3d(${tile.startLeft - tile.targetLeft}px, ${tile.startTop - tile.targetTop}px, 0) scale(${LOADER_SIZE / tile.targetWidth}, ${LOADER_SIZE / tile.targetHeight})`,
                transformOrigin: 'top left',
                transition:
                  isExpanded && !prefersReducedMotion
                    ? `transform ${EXPAND_DURATION_MS}ms var(--ease-layout), border-color ${EXPAND_DURATION_MS}ms var(--ease-layout)`
                    : 'none',
              }}
            >
              <motion.span
                className="intro__tile-fill"
                initial={false}
                animate={{ scale: loadedCount > index ? 1 : 0 }}
                transition={{
                  duration: PUBLIC_MOTION.micro,
                  ease: PUBLIC_MOTION.easeOut,
                }}
              />
              {tile.imageSrc ? (
                // The cloned frame creates a seamless hand-off to the real gallery.
                <motion.img
                  className="intro__tile-image"
                  src={tile.imageSrc}
                  alt=""
                  initial={false}
                  animate={{ opacity: phase === 'loading' ? 0 : 1 }}
                  transition={{
                    delay: prefersReducedMotion ? 0 : 0.14,
                    duration: prefersReducedMotion
                      ? PUBLIC_MOTION.reduced
                      : 0.72,
                    ease: PUBLIC_MOTION.easeLayout,
                  }}
                  style={{
                    filter: tile.imageFilter,
                    objectFit: tile.imageObjectFit as
                      'contain' | 'cover' | 'fill' | 'none' | 'scale-down',
                    objectPosition: tile.imageObjectPosition,
                    transform: tile.imageTransform,
                    transformOrigin: tile.imageTransformOrigin,
                  }}
                />
              ) : null}
            </div>
          ))}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
