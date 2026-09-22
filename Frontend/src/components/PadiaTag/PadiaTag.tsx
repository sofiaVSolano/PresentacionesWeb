import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { padia } from '@/data/padia'
import './PadiaTag.css'

const CARD_WIDTH = 272
const CARD_HEIGHT = 178
const MARGIN = 12

interface Placement {
  left: number
  top: number
  width: number
  flipped: boolean
}

/** Sitúa la credencial junto a la palabra, sin que se salga de la pantalla */
function placeFor(word: HTMLElement): Placement {
  const rect = word.getBoundingClientRect()
  const width = Math.min(CARD_WIDTH, window.innerWidth - MARGIN * 2)
  const flipped = rect.bottom + CARD_HEIGHT > window.innerHeight
  return {
    width,
    flipped,
    left: Math.min(Math.max(MARGIN, rect.left), window.innerWidth - width - MARGIN),
    top: flipped ? rect.top : rect.bottom,
  }
}

/**
 * Anotación viva: la palabra PADIA, dentro de la frase donde Sofía la menciona,
 * lleva al semillero y al pasar por encima despliega una credencial.
 *
 * La palabra es un enlace de verdad, así que con teclado se tabula y se abre con
 * Enter; la credencial solo describe (va enlazada con `aria-describedby`) y se
 * monta en un portal porque la tarjeta que la contiene recorta lo que sobresale.
 * Con el dedo, el primer toque la muestra y el segundo abre el sitio.
 */
export function PadiaTag() {
  const [placement, setPlacement] = useState<Placement | null>(null)
  const wrapRef = useRef<HTMLSpanElement>(null)
  const cardRef = useRef<HTMLSpanElement>(null)
  const coarsePointer = useRef(false)
  const cardId = useId()
  const open = placement !== null

  const show = useCallback(() => {
    if (wrapRef.current) setPlacement(placeFor(wrapRef.current))
  }, [])

  // Mientras está abierta sigue a la palabra: el scroll es suave y continuo, así
  // que se recoloca por fotograma tocando el DOM, sin re-renderizar.
  useEffect(() => {
    if (!open) return
    let raf = 0
    const follow = () => {
      const word = wrapRef.current
      const card = cardRef.current
      if (word && card) {
        const next = placeFor(word)
        card.style.left = `${next.left}px`
        card.style.top = `${next.top}px`
        card.dataset.flipped = String(next.flipped)
      }
      raf = requestAnimationFrame(follow)
    }
    raf = requestAnimationFrame(follow)

    const onDown = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setPlacement(null)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPlacement(null)
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <span
      className="padia-tag"
      ref={wrapRef}
      onPointerEnter={(e) => e.pointerType === 'mouse' && show()}
      onPointerLeave={(e) => e.pointerType === 'mouse' && setPlacement(null)}
    >
      <a
        className="padia-tag__word"
        href={padia.url}
        target="_blank"
        rel="noopener noreferrer"
        data-open={open}
        aria-describedby={open ? cardId : undefined}
        data-cursor="EL SEMILLERO"
        onPointerDown={(e) => {
          coarsePointer.current = e.pointerType !== 'mouse'
        }}
        onClick={(e) => {
          // con el dedo: el primer toque enseña la credencial, el segundo ya navega
          if (coarsePointer.current && !open) {
            e.preventDefault()
            show()
          }
        }}
        onFocus={show}
        onBlur={() => setPlacement(null)}
      >
        {/* la célula: late despacio y se llena cuando la credencial está abierta */}
        <span className="padia-tag__cell" aria-hidden="true" />
        {padia.acronym} · {padia.role}
      </a>

      {placement &&
        createPortal(
          <span
            className="padia-tag__card"
            ref={cardRef}
            id={cardId}
            data-flipped={placement.flipped}
            style={{ left: placement.left, top: placement.top, width: placement.width }}
          >
            <span className="padia-tag__role">Semillero de investigación</span>
            <span className="padia-tag__name">{padia.name}</span>
            <span className="padia-tag__uni">{padia.university}</span>
            <span className="padia-tag__link">
              lidis.usbcali.edu.co/padia
              <svg viewBox="0 0 12 12" aria-hidden="true" focusable="false">
                <path
                  d="M3.5 8.5 8.5 3.5M4.6 3.5h3.9v3.9"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </span>,
          document.body
        )}
    </span>
  )
}
