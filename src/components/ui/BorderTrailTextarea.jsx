import { BorderTrail } from '../core/BorderTrail'

/**
 * BorderTrailTextarea
 * A textarea with an animated cyan/purple border trail — Solo Leveling style.
 */
export function BorderTrailTextarea({
  value,
  onChange,
  placeholder = 'Enter quest notes...',
  rows,
  className = '',
  trailColor = 'cyan',
  ...props
}) {
  const gradientMap = {
    cyan: 'border-trail--cyan',
    purple: 'border-trail--purple',
    gold: 'border-trail--gold',
    green: 'border-trail--green',
  }

  return (
    <div className={`border-trail-textarea ${className}`}>
      <textarea
        className="border-trail-textarea__input"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        {...props}
      />
      <BorderTrail
        className={gradientMap[trailColor] || gradientMap.cyan}
        size={120}
      />
    </div>
  )
}

/**
 * BorderTrailInput
 * A single-line input variant with the same trail effect.
 */
export function BorderTrailInput({
  value,
  onChange,
  placeholder = '',
  type = 'text',
  className = '',
  trailColor = 'cyan',
  ...props
}) {
  const gradientMap = {
    cyan: 'border-trail--cyan',
    purple: 'border-trail--purple',
    gold: 'border-trail--gold',
    green: 'border-trail--green',
  }

  return (
    <div className={`border-trail-input ${className}`}>
      <input
        className="border-trail-input__field"
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        {...props}
      />
      <BorderTrail
        className={gradientMap[trailColor] || gradientMap.cyan}
        size={80}
        transition={{ duration: 6 }}
      />
    </div>
  )
}

/**
 * BorderTrailCard
 * A card / panel wrapper with the trail effect.
 */
export function BorderTrailCard({
  children,
  className = '',
  trailColor = 'cyan',
  trailSize = 100,
  ...props
}) {
  const gradientMap = {
    cyan: 'border-trail--cyan',
    purple: 'border-trail--purple',
    gold: 'border-trail--gold',
    green: 'border-trail--green',
  }

  return (
    <div className={`border-trail-card glass-panel ${className}`} {...props}>
      {children}
      <BorderTrail
        className={gradientMap[trailColor] || gradientMap.cyan}
        size={trailSize}
        transition={{ duration: 10 }}
      />
    </div>
  )
}

export default BorderTrailTextarea
