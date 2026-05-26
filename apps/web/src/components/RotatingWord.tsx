'use client';

import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';

/**
 * Cycles through a list of words with a slide-up / slide-down transition.
 * Used in the "For who" section — instead of a generic feature grid we show
 * one moving word: "Built for recruiters" → "Built for founders" → …
 */
export function RotatingWord({
  words,
  intervalMs = 2200,
  className = '',
}: {
  words: string[];
  intervalMs?: number;
  className?: string;
}) {
  const prefersReducedMotion = useReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (prefersReducedMotion) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % words.length), intervalMs);
    return () => clearInterval(id);
  }, [words.length, intervalMs, prefersReducedMotion]);

  // Compute max width hint so the rest of the line doesn't reflow.
  const longest = words.reduce((a, b) => (b.length > a.length ? b : a), '');

  return (
    <span className={`relative inline-block align-baseline ${className}`}>
      {/* Invisible spacer to reserve width of the longest word */}
      <span className="invisible" aria-hidden>
        {longest}
      </span>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={words[index]}
          initial={prefersReducedMotion ? false : { y: '0.6em', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={prefersReducedMotion ? undefined : { y: '-0.6em', opacity: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0 bg-gradient-to-r from-indigo-300 to-fuchsia-300 bg-clip-text text-transparent"
        >
          {words[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
