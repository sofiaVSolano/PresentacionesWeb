import { useRef } from 'react'
import { gsap } from '@/animations/gsap'
import { useGsapContext } from '@/hooks/useGsapContext'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import './KineticText.css'

interface KineticTextProps {
  text: string
  /** Palabras que se pintan en acento (comparación sin signos de puntuación ni mayúsculas) */
  accent?: string[]
  /** Acotado a etiquetas de texto: React Three Fiber añade elementos 3D al JSX global */
  as?: 'h1' | 'h2' | 'h3' | 'p'
  className?: string
}

const stripPunctuation = (word: string) => word.replace(/[.,;:!?¿¡—]/g, '').toLowerCase()

/** Titular que se revela palabra por palabra al entrar en pantalla. */
export function KineticText({ text, accent = [], as: Tag = 'h2', className = '' }: KineticTextProps) {
  const ref = useRef<HTMLHeadingElement & HTMLParagraphElement>(null)
  const prefersReducedMotion = usePrefersReducedMotion()
  const accentSet = new Set(accent.map(stripPunctuation))

  useGsapContext(
    () => {
      const el = ref.current
      if (!el) return
      const words = el.querySelectorAll('.kinetic__word')

      if (prefersReducedMotion) {
        gsap.set(words, { y: 0 })
        return
      }

      // `y` en píxeles (no yPercent): el estado inicial viene del CSS como matriz,
      // y GSAP lo lee en px — animar yPercent dejaría el desplazamiento original intacto.
      gsap.to(words, {
        y: 0,
        duration: 0.85,
        stagger: 0.05,
        ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 85%', once: true },
      })
    },
    [prefersReducedMotion, text],
    ref
  )

  return (
    <Tag className={`kinetic ${className}`} ref={ref}>
      {text.split(' ').map((word, i) => (
        <span className="kinetic__mask" key={`${word}-${i}`}>
          <span
            className={`kinetic__word${accentSet.has(stripPunctuation(word)) ? ' kinetic__word--accent' : ''}`}
          >
            {word}
          </span>
          {i < text.split(' ').length - 1 ? ' ' : ''}
        </span>
      ))}
    </Tag>
  )
}
