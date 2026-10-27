import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../../lib/utils'

/**
 * TextEffect — per‑character / per‑word / per‑line animated text reveal.
 *
 * Props:
 *   children          — The text string to animate
 *   per               — 'char' | 'word' | 'line' (default: 'word')
 *   as                — HTML element tag (default: 'p')
 *   preset            — 'fade' | 'blur' | 'fade-in-blur' | 'scale' | 'slide'
 *   delay             — Delay before animation starts (seconds)
 *   speedReveal       — Overall reveal speed multiplier
 *   speedSegment      — Per‑segment stagger override (seconds)
 *   trigger           — Controls visibility (default: true)
 *   variants          — { container, item } framer‑motion Variants overrides
 *   className         — Class on the root element
 *   segmentWrapperClassName — Class on each segment wrapper
 *   containerTransition — Transition overrides for the container
 *   segmentTransition   — Transition overrides for each segment
 *   onAnimationComplete — Callback when animation finishes
 *   style             — Inline styles on the root element
 */

const defaultStaggerTimes = {
  char: 0.03,
  word: 0.05,
  line: 0.1,
}

const defaultContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
  exit: {
    transition: { staggerChildren: 0.05, staggerDirection: -1 },
  },
}

const defaultItemVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
}

const presetVariants = {
  blur: {
    container: defaultContainerVariants,
    item: {
      hidden: { opacity: 0, filter: 'blur(12px)' },
      visible: { opacity: 1, filter: 'blur(0px)' },
      exit: { opacity: 0, filter: 'blur(12px)' },
    },
  },
  'fade-in-blur': {
    container: defaultContainerVariants,
    item: {
      hidden: { opacity: 0, y: 20, filter: 'blur(12px)' },
      visible: { opacity: 1, y: 0, filter: 'blur(0px)' },
      exit: { opacity: 0, y: 20, filter: 'blur(12px)' },
    },
  },
  scale: {
    container: defaultContainerVariants,
    item: {
      hidden: { opacity: 0, scale: 0.8 },
      visible: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 0.8 },
    },
  },
  fade: {
    container: defaultContainerVariants,
    item: {
      hidden: { opacity: 0 },
      visible: { opacity: 1 },
      exit: { opacity: 0 },
    },
  },
  slide: {
    container: defaultContainerVariants,
    item: {
      hidden: { opacity: 0, y: 20 },
      visible: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: 20 },
    },
  },
}

export function TextEffect({
  children,
  per = 'word',
  as: Component = 'p',
  variants,
  className,
  preset = 'fade',
  delay = 0,
  speedReveal = 1,
  speedSegment,
  trigger = true,
  onAnimationComplete,
  onAnimationStart,
  segmentWrapperClassName,
  containerTransition,
  segmentTransition,
  style,
}) {
  // Determine which variants to use
  const selectedVariants = variants || presetVariants[preset] || presetVariants.fade
  const stagger = speedSegment ?? defaultStaggerTimes[per] / speedReveal

  // Build container variants with stagger timing
  const containerVariants = useMemo(() => {
    const base = selectedVariants.container || defaultContainerVariants
    return {
      ...base,
      visible: {
        ...base.visible,
        transition: {
          ...(base.visible?.transition || {}),
          staggerChildren: stagger,
          delayChildren: delay,
          ...containerTransition,
        },
      },
      exit: {
        ...base.exit,
        transition: {
          ...(base.exit?.transition || {}),
          staggerChildren: stagger,
          staggerDirection: -1,
        },
      },
    }
  }, [selectedVariants, stagger, delay, containerTransition])

  const itemVariants = useMemo(() => {
    const base = selectedVariants.item || defaultItemVariants
    if (segmentTransition) {
      return {
        ...base,
        visible: {
          ...base.visible,
          transition: segmentTransition,
        },
      }
    }
    return base
  }, [selectedVariants, segmentTransition])

  // Split text into segments
  const segments = useMemo(() => {
    if (per === 'line') {
      return children.split('\n')
    } else if (per === 'word') {
      return children.split(/(\s+)/)
    } else {
      // per char
      return children.split('')
    }
  }, [children, per])

  const MotionComponent = motion.create(Component)

  return (
    <AnimatePresence mode="popLayout">
      {trigger && (
        <MotionComponent
          key="text-effect"
          className={cn('text-effect', className)}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onAnimationComplete={onAnimationComplete}
          onAnimationStart={onAnimationStart}
          style={{ display: 'inline', ...style }}
        >
          {segments.map((segment, i) => {
            // Preserve whitespace segments
            if (/^\s+$/.test(segment)) {
              return <span key={`space-${i}`}>{segment}</span>
            }

            if (per === 'char' || per === 'line') {
              return (
                <motion.span
                  key={`${segment}-${i}`}
                  variants={itemVariants}
                  className={segmentWrapperClassName}
                  style={{ display: 'inline-block', whiteSpace: 'pre' }}
                >
                  {segment}
                </motion.span>
              )
            }

            // Per word: animate word, but also allow per-char inside
            return (
              <motion.span
                key={`${segment}-${i}`}
                variants={itemVariants}
                className={segmentWrapperClassName}
                style={{ display: 'inline-block', whiteSpace: 'pre' }}
              >
                {segment}
              </motion.span>
            )
          })}
        </MotionComponent>
      )}
    </AnimatePresence>
  )
}

export default TextEffect
