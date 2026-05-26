'use client';

import { motion, useScroll, useTransform } from 'motion/react';
import { useRef } from 'react';

/**
 * Text that fills with foreground color as you scroll past it.
 * The unfilled state is dim/translucent; as the element passes through
 * the viewport, the fill progresses 0 → 100%.
 *
 * Uses a `background-clip: text` gradient that we slide based on scroll
 * progress. The transform is applied via the `backgroundImage` motion
 * value directly (more reliable than CSS custom properties through the
 * style prop).
 */
export function ScrollFillText({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start 0.85', 'start 0.25'],
  });

  const backgroundImage = useTransform(
    scrollYProgress,
    (p) =>
      `linear-gradient(105deg, rgba(255,255,255,1) 0%, rgba(255,255,255,1) ${p * 100}%, rgba(255,255,255,0.16) ${p * 100}%, rgba(255,255,255,0.16) 100%)`,
  );

  return (
    <div ref={ref}>
      <motion.div
        className="bg-clip-text text-transparent"
        style={{ backgroundImage }}
      >
        {children}
      </motion.div>
    </div>
  );
}
