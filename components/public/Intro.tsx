'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';
import { getCover, featuredShootings } from '@/lib/content';

const SESSION_KEY = 'model-portfolio:intro-played';

export function Intro() {
  const [isVisible, setIsVisible] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const firstCover = getCover(featuredShootings[0]!);

  useEffect(() => {
    const hasPlayed = window.sessionStorage.getItem(SESSION_KEY) === 'true';
    if (!hasPlayed) {
      window.sessionStorage.setItem(SESSION_KEY, 'true');
      // The session state is only available after hydration.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsVisible(true);
    }
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    const timeout = window.setTimeout(
      () => setIsVisible(false),
      prefersReducedMotion ? 260 : 1320,
    );
    return () => window.clearTimeout(timeout);
  }, [isVisible, prefersReducedMotion]);

  if (!isReady) return null;

  return (
    <AnimatePresence>
      {isVisible ? (
        <motion.div
          className="intro"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: prefersReducedMotion ? 0.2 : 0.18 }}
          aria-hidden="true"
        >
          <motion.p
            className="intro__name"
            initial={{ opacity: 0 }}
            animate={{ opacity: prefersReducedMotion ? 0 : [0, 1, 1, 0] }}
            transition={{ duration: 0.85, times: [0, 0.24, 0.7, 1] }}
          >
            Zoe Schmidt
          </motion.p>
          <motion.div
            className="intro__slit"
            style={{ backgroundImage: `url(${firstCover.src})` }}
            initial={{ scaleY: prefersReducedMotion ? 1 : 0.008 }}
            animate={{ scaleY: 1 }}
            transition={{
              delay: prefersReducedMotion ? 0 : 0.45,
              duration: prefersReducedMotion ? 0.2 : 0.68,
              ease: [0.22, 1, 0.36, 1],
            }}
          />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
