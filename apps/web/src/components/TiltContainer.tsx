'use client';

import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';

/**
 * 3D-tilt wrapper. Tracks the cursor over the element and tilts the child
 * in 3D space toward the cursor. Subtle (max ~6deg). Hover off → snaps back
 * to flat. No-op for prefers-reduced-motion.
 */
export function TiltContainer({
  children,
  className = '',
  maxTilt = 5,
}: {
  children: ReactNode;
  className?: string;
  maxTilt?: number;
}) {
  const reduce = useReducedMotion();
  const rotX = useMotionValue(0);
  const rotY = useMotionValue(0);
  const sx = useSpring(rotX, { stiffness: 120, damping: 16 });
  const sy = useSpring(rotY, { stiffness: 120, damping: 16 });
  const transform = useTransform(
    [sx, sy],
    ([x, y]) => `perspective(1200px) rotateX(${x}deg) rotateY(${y}deg)`,
  );

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    if (reduce) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    rotX.set(-py * maxTilt * 2);
    rotY.set(px * maxTilt * 2);
  }
  function onLeave() {
    rotX.set(0);
    rotY.set(0);
  }

  return (
    <motion.div
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ transform, transformStyle: 'preserve-3d' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
