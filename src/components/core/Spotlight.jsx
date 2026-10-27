import { useRef, useCallback } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'
import { cn } from '../../lib/utils'

/**
 * Spotlight — a glowing blob that follows the mouse cursor within its parent.
 *
 * The parent element must have `position: relative` and `overflow: hidden`.
 *
 * Props:
 *   className     — extra classes applied to the glow blob (colour, blur, etc.)
 *   size          — diameter of the glow blob in pixels (default 200)
 *   springOptions — framer-motion spring config for cursor tracking
 *                   { bounce, duration, stiffness, damping, mass, … }
 */
export function Spotlight({
  className,
  size = 200,
  springOptions = {
    bounce: 0.3,
    duration: 0.1,
  },
}) {
  const containerRef = useRef(null)

  // Raw mouse position (relative to container top-left, offset by blob centre)
  const mouseX = useMotionValue(-size * 2)
  const mouseY = useMotionValue(-size * 2)

  // Spring-smoothed position
  const springX = useSpring(mouseX, springOptions)
  const springY = useSpring(mouseY, springOptions)

  const handleMouseMove = useCallback(
    (e) => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      mouseX.set(e.clientX - rect.left - size / 2)
      mouseY.set(e.clientY - rect.top - size / 2)
    },
    [mouseX, mouseY, size]
  )

  const handleMouseLeave = useCallback(() => {
    mouseX.set(-size * 2)
    mouseY.set(-size * 2)
  }, [mouseX, mouseY, size])

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        borderRadius: 'inherit',
        pointerEvents: 'auto',
      }}
    >
      <motion.div
        className={cn('spotlight__glow', className)}
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: '50%',
          x: springX,
          y: springY,
          pointerEvents: 'none',
        }}
      />
    </div>
  )
}

export default Spotlight
