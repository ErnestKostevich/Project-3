'use client';

import { motion, useReducedMotion } from 'motion/react';

/**
 * Subtle background glow. One big soft orb in the top-right that slowly
 * drifts. Toned down from the previous three-orb aurora — competing visuals
 * fought the hero content for attention. One orb, single accent color,
 * heavy blur, low opacity.
 */
export function AuroraBackground() {
  const prefersReducedMotion = useReducedMotion();
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <motion.div
        aria-hidden
        className="absolute -right-40 -top-40 size-[700px] rounded-full opacity-30 blur-3xl"
        style={{
          background:
            'radial-gradient(circle at center, rgba(99,102,241,0.5), transparent 65%)',
        }}
        animate={prefersReducedMotion ? {} : { x: [0, -40, 0], y: [0, 30, 0] }}
        transition={{ duration: 24, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Faint grid background — adds "developer tool" texture without competing for attention */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(ellipse at top, black, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(ellipse at top, black, transparent 70%)',
        }}
      />
    </div>
  );
}
