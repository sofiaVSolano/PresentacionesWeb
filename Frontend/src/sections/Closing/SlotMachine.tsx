import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { gsap } from '@/animations/gsap'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { useSound } from '@/audio/soundContext'
import { playBlip, playRevealChime, playWhooshRise } from '@/audio/soundEngine'
import { reasons } from '@/data/closing'
import type { Reason, ReasonSymbol } from '@/types/closing'

const SYMBOLS: ReasonSymbol[] = ['ai', 'trophy', 'research', 'lead', 'code', 'spark']

/** Copias de la tira: el rodillo da tres vueltas enteras antes de parar */
const COPIES = 4

/** Píxeles de tirón que hay que darle a la palanca para que arranque */
const PULL_DISTANCE = 90

const SYMBOL_ART: Record<ReasonSymbol, ReactNode> = {
  ai: (
    <>
      <circle cx="16" cy="16" r="4.5" />
      <path d="M16 4v7M16 21v7M4 16h7M21 16h7M7.5 7.5l5 5M19.5 19.5l5 5M24.5 7.5l-5 5M12.5 19.5l-5 5" />
    </>
  ),
  trophy: (
    <>
      <path d="M10 5h12v7a6 6 0 0 1-12 0V5Z" />
      <path d="M10 7H6v2a4 4 0 0 0 4 4M22 7h4v2a4 4 0 0 1-4 4M16 18v5M11 27h10l-1-4h-8l-1 4Z" />
    </>
  ),
  research: (
    <>
      <path d="M13 4v8L7 24a3 3 0 0 0 2.7 4h12.6A3 3 0 0 0 25 24l-6-12V4" />
      <path d="M11 4h10M10.5 18h11" />
    </>
  ),
  lead: (
    <>
      <circle cx="16" cy="9" r="4" />
      <path d="M8 27c0-4.4 3.6-8 8-8s8 3.6 8 8" />
      <path d="M6 14a3 3 0 1 0 0-6M26 14a3 3 0 1 1 0-6" />
    </>
  ),
  code: (
    <>
      <path d="m11 9-7 7 7 7M21 9l7 7-7 7M18 5l-4 22" />
    </>
  ),
  spark: (
    <>
      <path d="M16 3l3.2 8.4L28 14l-8.8 2.6L16 25l-3.2-8.4L4 14l8.8-2.6L16 3Z" />
    </>
  ),
}

/** Un símbolo cualquiera, para los rodillos que no marcan el motivo.
    Vive fuera del componente: dentro, el linter no puede saber que solo se
    llama al tirar de la palanca y lo toma por impureza de renderizado. */
function randomSymbol() {
  return Math.floor(Math.random() * SYMBOLS.length)
}

/** Baraja una copia: se llama una sola vez, al montar */
function shuffled<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/**
 * La tragamonedas de "¿Por qué yo?".
 *
 * Cada tirada destapa un motivo distinto —nunca repite hasta haberlos enseñado
 * todos— y en la última los tres rodillos cuadran: ese es el premio, y con él
 * se destraba el CV. Los rodillos son el envoltorio; lo que de verdad importa
 * es el motivo, que sale escrito al lado y queda guardado en la bandeja para
 * poder releerlo sin gastar otra tirada.
 *
 * La palanca se tira de verdad: se puede arrastrar hacia abajo como la de una
 * máquina, o pulsarla si se prefiere. Nada de esto ocurre con el scroll — pasar
 * por la sección no obliga a nadie a jugar.
 */
export function SlotMachine({ onComplete }: { onComplete: () => void }) {
  const [order] = useState(() => shuffled(reasons))
  const [current, setCurrent] = useState<Reason | null>(null)
  const [seen, setSeen] = useState(0)
  const [spinning, setSpinning] = useState(false)

  const reelRefs = useRef<(HTMLDivElement | null)[]>([])
  const leverRef = useRef<HTMLButtonElement>(null)
  const armRef = useRef<HTMLSpanElement>(null)
  const landed = useRef<number[]>([0, 1, 2])
  const drag = useRef<{ startY: number; pulled: number; moved: boolean } | null>(null)
  const draggedAt = useRef(0)

  const prefersReducedMotion = usePrefersReducedMotion()
  const { enabled: soundEnabled } = useSound()

  const complete = seen >= order.length
  const jackpot = complete && current !== null

  /** Desplazamiento de la tira para que la casilla `index` quede en la línea central */
  const offsetFor = (strip: HTMLDivElement, index: number) => {
    const cell = strip.firstElementChild?.getBoundingClientRect().height ?? 0
    return -(index - 1) * cell
  }

  // En reposo los tres rodillos tienen que enseñar símbolos distintos: si todos
  // arrancan en la misma casilla, la máquina parece premiada antes de jugar.
  useEffect(() => {
    reelRefs.current.forEach((strip, i) => {
      if (strip) gsap.set(strip, { y: offsetFor(strip, landed.current[i]) })
    })
  }, [])

  const reveal = (reason: Reason, isLast: boolean) => {
    setCurrent(reason)
    setSeen((value) => value + 1)
    setSpinning(false)
    if (soundEnabled) (isLast ? playRevealChime : playBlip)()
    if (isLast) onComplete()
  }

  const spin = () => {
    if (spinning || complete) return
    const next = order[seen]
    if (!next) return

    const isLast = seen === order.length - 1
    const middle = SYMBOLS.indexOf(next.symbol)
    // en la última tirada los tres rodillos cuadran: es el premio
    const targets = isLast ? [middle, middle, middle] : [randomSymbol(), middle, randomSymbol()]

    if (prefersReducedMotion) {
      reelRefs.current.forEach((strip, i) => {
        if (strip) gsap.set(strip, { y: offsetFor(strip, targets[i]) })
      })
      landed.current = targets
      reveal(next, isLast)
      return
    }

    setSpinning(true)
    if (soundEnabled) playWhooshRise()
    pullLever()

    reelRefs.current.forEach((strip, i) => {
      if (!strip) return
      const duration = 1.15 + i * 0.32
      gsap.killTweensOf(strip)
      gsap.set(strip, { y: offsetFor(strip, landed.current[i]) })

      // La tira gira varias vueltas y frena. El desenfoque se va con `power2.in`
      // —se mantiene casi todo el giro y se limpia de golpe al parar—: con una
      // curva `out` desaparecía en las primeras décimas y no se llegaba a ver.
      gsap.fromTo(
        strip,
        { filter: 'blur(8px)' },
        { filter: 'blur(0px)', duration: duration * 0.92, ease: 'power2.in' }
      )
      gsap.to(strip, {
        y: offsetFor(strip, targets[i] + SYMBOLS.length * (COPIES - 1)),
        duration,
        ease: 'power4.out',
        onComplete: () => {
          // se vuelve a la primera copia para que la próxima tirada arranque igual
          const y = offsetFor(strip, targets[i])
          gsap.fromTo(strip, { y: y - 7 }, { y, duration: 0.26, ease: 'back.out(3.5)' })
          if (soundEnabled) playBlip()
          if (i === reelRefs.current.length - 1) {
            landed.current = targets
            reveal(next, isLast)
          }
        },
      })
    })
  }

  // ---- La palanca: se tira de ella o se pulsa ----

  const pullLever = () => {
    const arm = armRef.current
    if (!arm) return
    gsap
      .timeline()
      .to(arm, { rotate: 62, duration: 0.18, ease: 'power2.in' })
      .to(arm, { rotate: 0, duration: 0.7, ease: 'elastic.out(1, 0.45)' })
  }

  const onPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const el = leverRef.current
    if (!el || spinning || complete) return
    el.setPointerCapture(event.pointerId)
    drag.current = { startY: event.clientY, pulled: 0, moved: false }
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const state = drag.current
    if (!state || !armRef.current) return
    state.pulled = Math.max(0, Math.min(1, (event.clientY - state.startY) / PULL_DISTANCE))
    if (state.pulled > 0.08) state.moved = true
    gsap.set(armRef.current, { rotate: state.pulled * 62 })
  }

  const endDrag = () => {
    const state = drag.current
    drag.current = null
    if (!state || !armRef.current) return
    if (!state.moved) return // fue un clic: lo atiende onClick
    // El navegador manda un `click` detrás del arrastre; se ignora por tiempo
    draggedAt.current = performance.now()
    if (state.pulled >= 0.5) spin()
    else gsap.to(armRef.current, { rotate: 0, duration: 0.5, ease: 'elastic.out(1, 0.45)' })
  }

  const onClick = () => {
    if (performance.now() - draggedAt.current < 350) return
    spin()
  }

  const leverLabel = complete
    ? 'Ya salieron las ocho'
    : spinning
      ? 'Girando…'
      : current
        ? 'Otra razón'
        : 'Tirar de la palanca'

  return (
    <div className="slot" data-spinning={spinning} data-jackpot={jackpot}>
      <div className="slot__side">
        <div className="slot__machine">
          {/* El cartel de arriba, con sus bombillas */}
          <div className="slot__sign" aria-hidden="true">
            <span className="slot__bulbs" />
            <span className="slot__sign-text">¿Por qué yo?</span>
            <span className="slot__bulbs" />
          </div>

          <div className="slot__window">
            <div className="slot__reels" aria-hidden="true">
              {[0, 1, 2].map((reel) => (
                <div className="slot__reel" key={reel}>
                  <div
                    className="slot__strip"
                    ref={(el) => {
                      reelRefs.current[reel] = el
                    }}
                  >
                    {Array.from({ length: COPIES }).flatMap((_, copy) =>
                      SYMBOLS.map((symbol) => (
                        <div className="slot__cell" key={`${copy}-${symbol}`}>
                          <svg
                            viewBox="0 0 32 32"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.6"
                          >
                            {SYMBOL_ART[symbol]}
                          </svg>
                        </div>
                      ))
                    )}
                  </div>
                  {/* Curvatura del tambor: sombra arriba y abajo */}
                  <span className="slot__curve" />
                </div>
              ))}
            </div>
            <span className="slot__glass" aria-hidden="true" />
            <span className="slot__payline" aria-hidden="true" />
          </div>

          <div className="slot__console">
            <p className="slot__credits">
              {complete ? 'Las ocho razones' : `${seen} de ${order.length}`}
            </p>
            <span className="slot__slot" aria-hidden="true" />
          </div>

          {/* La palanca, pegada al costado */}
          <button
            type="button"
            className="slot__lever"
            ref={leverRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onClick={onClick}
            disabled={spinning || complete}
            data-cursor={complete ? undefined : 'TIRAR'}
            aria-label={leverLabel}
          >
            <span className="slot__lever-arm" ref={armRef} aria-hidden="true">
              <span className="slot__lever-ball" />
            </span>
          </button>
        </div>

        <p className="slot__lever-label">{leverLabel}</p>
      </div>

      <div className="slot__output" aria-live="polite">
        {current ? (
          <>
            <p className="slot__count">
              {jackpot ? 'Premio · las ocho razones' : `Razón ${seen} de ${order.length}`}
            </p>
            <p className="slot__title">{current.title}</p>
            <p className="slot__proof">{current.proof}</p>
          </>
        ) : (
          <p className="slot__hint">
            {spinning
              ? 'Girando…'
              : 'Tira de la palanca. Cada tirada destapa un motivo distinto para contratarme — y todos vienen con su prueba.'}
          </p>
        )}

        {/* Lo que ya salió: se puede releer sin gastar otra tirada */}
        <ul className="slot__tray">
          {order.map((reason, index) => {
            const got = index < seen
            return (
              <li key={reason.id}>
                <button
                  type="button"
                  className="slot__token"
                  data-got={got}
                  data-active={got && current?.id === reason.id}
                  disabled={!got}
                  onClick={() => setCurrent(reason)}
                  data-cursor={got ? 'RELEER' : undefined}
                  aria-label={got ? reason.title : `Ficha ${index + 1}, todavía sin destapar`}
                >
                  <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.6">
                    {SYMBOL_ART[reason.symbol]}
                  </svg>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
