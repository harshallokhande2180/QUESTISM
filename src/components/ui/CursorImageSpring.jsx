import { useRef, useState } from 'react'
import { Cursor } from '../core/Cursor'
import { AnimatePresence, motion } from 'framer-motion'

/**
 * CursorImageSpring
 * 
 * A component that shows a spring-physics cursor with a "More +" pill
 * that expands when hovering over a target image. Adapted from
 * motion-primitives for the Questism Solo Leveling design.
 *
 * Props:
 *   imageSrc   — URL to the image to display
 *   imageAlt   — alt text for the image
 *   label      — text shown in the cursor pill on hover (default: "View")
 *   onClick    — optional click handler on the image
 */
export function CursorImageSpring({
  imageSrc,
  imageAlt = '',
  label = 'View',
  onClick,
  className = '',
}) {
  const [isHovering, setIsHovering] = useState(false)
  const targetRef = useRef(null)

  const handlePositionChange = (x, y) => {
    if (targetRef.current) {
      const rect = targetRef.current.getBoundingClientRect()
      const isInside =
        x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
      setIsHovering(isInside)
    }
  }

  return (
    <div
      className={`cursor-image-spring ${className}`}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'none',
      }}
    >
      <Cursor
        attachToParent
        variants={{
          initial: { scale: 0.3, opacity: 0 },
          animate: { scale: 1, opacity: 1 },
          exit: { scale: 0.3, opacity: 0 },
        }}
        springConfig={{
          bounce: 0.001,
        }}
        transition={{
          ease: 'easeInOut',
          duration: 0.15,
        }}
        onPositionChange={handlePositionChange}
      >
        <motion.div
          animate={{
            width: isHovering ? 80 : 16,
            height: isHovering ? 32 : 16,
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '24px',
            background: 'rgba(0, 229, 255, 0.25)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(0, 229, 255, 0.3)',
          }}
        >
          <AnimatePresence>
            {isHovering ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6 }}
                style={{
                  display: 'inline-flex',
                  width: '100%',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  fontSize: '0.75rem',
                  fontFamily: 'var(--font-hud)',
                  fontWeight: 600,
                  color: '#00E5FF',
                  letterSpacing: '0.05em',
                  whiteSpace: 'nowrap',
                  gap: '4px',
                }}>
                  {label}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </span>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </motion.div>
      </Cursor>

      <div
        ref={targetRef}
        onClick={onClick}
        style={{ cursor: onClick ? 'none' : 'default' }}
      >
        <img
          src={imageSrc}
          alt={imageAlt}
          style={{
            height: '13rem',
            width: '100%',
            maxWidth: '12rem',
            borderRadius: '8px',
            border: '1px solid var(--border-glow)',
            objectFit: 'cover',
            transition: 'transform 0.3s ease, box-shadow 0.3s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.03)'
            e.currentTarget.style.boxShadow = '0 0 24px rgba(0, 229, 255, 0.2)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)'
            e.currentTarget.style.boxShadow = 'none'
          }}
        />
      </div>
    </div>
  )
}

export default CursorImageSpring
