import { cn } from '../../lib/utils'
import { motion } from 'framer-motion'

/**
 * BorderTrail — animated glowing trail that orbits the border of its parent.
 *
 * Usage:
 *   Parent must have `position: relative`, `overflow: hidden`, and a `border-radius`.
 *
 * Props:
 *   className  — gradient classes for the trail glow colour
 *   size       — pixel width of the glow blob (default 60)
 *   transition — framer-motion Transition overrides
 *   onAnimationComplete — callback when one loop finishes
 */
export function BorderTrail({
  className,
  size = 60,
  transition,
  delay = 0,
  onAnimationComplete,
  style = {},
}) {
  const defaultTransition = {
    repeat: Infinity,
    ease: 'linear',
    duration: 8,
    delay,
    ...transition,
  }

  return (
    <div
      className="border-trail__container"
      style={{
        position: 'absolute',
        inset: 0,
        borderRadius: 'inherit',
        border: '1px solid transparent',
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      <motion.div
        className={cn('border-trail__glow', className)}
        style={{
          position: 'absolute',
          aspectRatio: '1 / 1',
          width: size,
          offsetPath: `rect(0 auto auto 0 round ${size}px)`,
          ...style,
        }}
        animate={{
          offsetDistance: ['0%', '100%'],
        }}
        transition={defaultTransition}
        onAnimationComplete={onAnimationComplete}
      />
    </div>
  )
}

export default BorderTrail
