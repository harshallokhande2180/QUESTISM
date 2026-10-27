import React, { useEffect, useState, useRef, useCallback } from 'react'
import {
  motion,
  useMotionValue,
  useSpring,
  AnimatePresence,
} from 'framer-motion'
import { cn } from '../../lib/utils'

/**
 * Cursor — Spring‑animated custom cursor that follows the mouse.
 *
 * Props:
 *   children        — Inner content rendered inside the cursor bubble
 *   className       — Extra classes on the wrapper
 *   springConfig    — framer‑motion SpringOptions (stiffness, damping, mass…)
 *   attachToParent  — If true, cursor is only visible while hovering the parent
 *   transition      — AnimatePresence enter / exit transition
 *   variants        — { initial, animate, exit } framer‑motion Variant objects
 *   onPositionChange — Callback fired with (x, y) on every mouse move
 */
export function Cursor({
  children,
  className,
  springConfig,
  attachToParent,
  variants,
  transition,
  onPositionChange,
}) {
  const cursorX = useMotionValue(0)
  const cursorY = useMotionValue(0)
  const cursorRef = useRef(null)
  const [isVisible, setIsVisible] = useState(!attachToParent)

  // Centre cursor on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      cursorX.set(window.innerWidth / 2)
      cursorY.set(window.innerHeight / 2)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Spring physics
  const cursorXSpring = useSpring(cursorX, {
    stiffness: 300,
    damping: 30,
    mass: 0.5,
    ...springConfig,
  })
  const cursorYSpring = useSpring(cursorY, {
    stiffness: 300,
    damping: 30,
    mass: 0.5,
    ...springConfig,
  })

  // Global mousemove handler (non‑attachToParent mode)
  useEffect(() => {
    if (attachToParent) return

    const handleMouseMove = (e) => {
      // Offset by half cursor size to centre under the pointer
      cursorX.set(e.clientX - 8)
      cursorY.set(e.clientY - 8)
      onPositionChange?.(e.clientX, e.clientY)
    }

    document.addEventListener('mousemove', handleMouseMove)
    return () => document.removeEventListener('mousemove', handleMouseMove)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attachToParent])

  // Parent‑relative mouse tracking
  useEffect(() => {
    if (!attachToParent || !cursorRef.current) return

    const parent = cursorRef.current.parentElement
    if (!parent) return

    const handleMouseMove = (e) => {
      const rect = parent.getBoundingClientRect()
      cursorX.set(e.clientX - rect.left)
      cursorY.set(e.clientY - rect.top)
      onPositionChange?.(e.clientX, e.clientY)
    }

    const handleMouseEnter = () => setIsVisible(true)
    const handleMouseLeave = () => setIsVisible(false)

    parent.addEventListener('mousemove', handleMouseMove)
    parent.addEventListener('mouseenter', handleMouseEnter)
    parent.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      parent.removeEventListener('mousemove', handleMouseMove)
      parent.removeEventListener('mouseenter', handleMouseEnter)
      parent.removeEventListener('mouseleave', handleMouseLeave)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attachToParent])

  return (
    <motion.div
      ref={cursorRef}
      className={cn('cursor-wrapper', className)}
      style={{
        position: attachToParent ? 'absolute' : 'fixed',
        left: 0,
        top: 0,
        x: cursorXSpring,
        y: cursorYSpring,
        zIndex: 50,
        pointerEvents: 'none',
        transform: 'translate(-50%, -50%)',
      }}
    >
      <AnimatePresence>
        {isVisible && (
          <motion.div
            variants={variants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={transition}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default Cursor
