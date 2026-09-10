'use client';

import { motion, useReducedMotion } from 'motion/react';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { PUBLIC_MOTION } from '@/lib/public-motion';

export default function Template({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const prefersReducedMotion = useReducedMotion();

  if (pathname.startsWith('/studio')) return children;

  return (
    <motion.div
      className="public-route-transition"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{
        duration: prefersReducedMotion ? 0 : PUBLIC_MOTION.route,
        ease: PUBLIC_MOTION.easeOut,
      }}
    >
      {children}
    </motion.div>
  );
}
