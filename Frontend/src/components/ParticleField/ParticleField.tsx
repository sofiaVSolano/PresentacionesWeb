import { useState } from 'react'
import './ParticleField.css'

interface ParticleFieldProps {
  count?: number
}

// Generado una sola vez con estado perezoso: Math.random() no puede llamarse
// directamente en el cuerpo del render (regla react-hooks/purity).
function createParticles(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    top: 40 + Math.random() * 55,
    size: 1.5 + Math.random() * 2.5,
    duration: 8 + Math.random() * 10,
    delay: Math.random() * -12,
    opacity: 0.25 + Math.random() * 0.35,
  }))
}

export function ParticleField({ count = 22 }: ParticleFieldProps) {
  const [particles] = useState(() => createParticles(count))

  return (
    <div className="particle-field" aria-hidden="true">
      {particles.map((p) => (
        <span
          key={p.id}
          className="particle-field__dot"
          style={
            {
              left: `${p.left}%`,
              top: `${p.top}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              '--particle-duration': `${p.duration}s`,
              '--particle-delay': `${p.delay}s`,
              '--particle-opacity': p.opacity,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  )
}
