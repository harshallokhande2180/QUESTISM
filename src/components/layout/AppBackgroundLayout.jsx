import SungJinWooBackground from '../core/SungJinWooBackground'

/**
 * Global app chrome: animated void canvas + CRT scanline overlay wrapper.
 */
export default function AppBackgroundLayout({ children, className = '', style }) {
  return (
    <>
      <SungJinWooBackground />
      <div
        className={`crt-overlay app-viewport${className ? ` ${className}` : ''}`}
        style={style}
      >
        {children}
      </div>
    </>
  )
}
