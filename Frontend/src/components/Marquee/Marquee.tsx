import './Marquee.css'

interface MarqueeProps {
  items: string[]
  duration?: number
  /** Hacia la derecha en vez de hacia la izquierda (útil para cintas cruzadas) */
  reverse?: boolean
  className?: string
}

/** Cinta editorial con loop infinito y sin costuras (el track se duplica una vez). */
export function Marquee({ items, duration = 24, reverse = false, className = '' }: MarqueeProps) {
  const track = [...items, ...items]

  return (
    <div className={`marquee ${className}`.trim()} data-reverse={reverse} aria-hidden="true">
      <div
        className="marquee__track"
        style={{ '--marquee-duration': `${duration}s` } as React.CSSProperties}
      >
        {track.map((item, i) => (
          <span className="marquee__item" key={i}>
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}
