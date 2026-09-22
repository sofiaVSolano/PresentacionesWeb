import { useEffect, useRef, useState, type AnimationEvent } from 'react'
import { FrameSequence } from '@/animations/frameSequence'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { useSound } from '@/audio/soundContext'
import { reactionFrames, type ReactionName } from '@/data/reactionFrames'
import './AvatarReaction.css'

const CAPTION: Record<ReactionName, string> = {
  on: 'Así me gusta',
  off: 'Vale, en silencio',
}

/** Chispas que salen al aparecer. Son decorado: el número solo lo dice el CSS. */
const SPARKS = [0, 1, 2, 3, 4, 5]

/**
 * Red de seguridad para retirar la tarjeta si la animación de salida no llega a
 * correr (con `prefers-reduced-motion` no hay animación que termine).
 */
const EXIT_FALLBACK_MS = 600

const urlsFor = (name: ReactionName) =>
  Array.from(
    { length: reactionFrames[name].count },
    (_, i) => `${reactionFrames[name].basePath}/frame-${String(i + 1).padStart(3, '0')}.webp`
  )

/**
 * La muñequita reacciona cuando alguien toca el control de sonido: se pone los
 * audífonos al encender y se los quita al apagar.
 *
 * Se dibuja con la misma secuencia de fotogramas que el resto del sitio (pesa
 * una fracción del video) y no se descarga nada hasta el primer toque. La
 * tarjeta es crema y el lienzo va en `multiply`, así el fondo blanco del render
 * desaparece sin tener que recortar la figura.
 *
 * Entra y sale hacia el botón de sonido, que es de donde viene: crece desde esa
 * esquina con un rebote y se encoge hacia allá al irse. La salida no puede ser
 * un `return null` a secas —desaparecería de golpe—, así que la tarjeta se
 * queda montada mientras dura y solo entonces se retira.
 */
export function AvatarReaction() {
  // Cada toque es una señal nueva aunque repita gesto: con el `id` la secuencia
  // se vuelve a reproducir en vez de quedarse congelada en el último fotograma.
  const [cue, setCue] = useState<{ name: ReactionName; id: number } | null>(null)
  const [leaving, setLeaving] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sequenceRef = useRef<FrameSequence | null>(null)
  const hideTimer = useRef(0)
  const exitTimer = useRef(0)
  const nextId = useRef(0)
  const { music, effects } = useSound()
  const previous = useRef({ music, effects })
  const prefersReducedMotion = usePrefersReducedMotion()

  const reaction = cue?.name ?? null

  // Qué cambió: encender algo pide una reacción, apagarlo la contraria
  useEffect(() => {
    const before = previous.current
    if (before.music === music && before.effects === effects) return
    const turnedOn = (music && !before.music) || (effects && !before.effects)
    previous.current = { music, effects }
    nextId.current += 1
    setLeaving(false)
    setCue({ name: turnedOn ? 'on' : 'off', id: nextId.current })
  }, [music, effects])

  // Reproduce la secuencia una vez y pide retirarse
  useEffect(() => {
    if (!cue) return
    const canvas = canvasRef.current
    if (!canvas) return

    const sequence = new FrameSequence({
      canvas,
      urls: urlsFor(cue.name),
      concurrency: 6,
      portrait: 'cover',
    })
    sequenceRef.current = sequence
    const resizeObserver = new ResizeObserver(() => sequence.resize())
    resizeObserver.observe(canvas)

    let raf = 0
    let cancelled = false
    const { count, fps } = reactionFrames[cue.name]
    const durationMs = (count / fps) * 1000

    const startExit = () => setLeaving(true)

    void sequence.loadFirst().then(() => {
      if (cancelled) return
      void sequence.loadAll()

      if (prefersReducedMotion) {
        // Sin animación: se enseña el final del gesto y se retira
        sequence.setProgress(1)
        hideTimer.current = window.setTimeout(startExit, 2200)
        return
      }

      const start = performance.now()
      const tick = (now: number) => {
        const progress = Math.min(1, (now - start) / durationMs)
        sequence.setProgress(progress)
        if (progress < 1) raf = requestAnimationFrame(tick)
        else hideTimer.current = window.setTimeout(startExit, 700)
      }
      raf = requestAnimationFrame(tick)
    })

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      window.clearTimeout(hideTimer.current)
      resizeObserver.disconnect()
      sequence.destroy()
      sequenceRef.current = null
    }
  }, [cue, prefersReducedMotion])

  const finishExit = () => {
    window.clearTimeout(exitTimer.current)
    setCue(null)
    setLeaving(false)
  }

  // Si la animación de salida no corre, la tarjeta se retira igual
  useEffect(() => {
    if (!leaving) return
    exitTimer.current = window.setTimeout(finishExit, EXIT_FALLBACK_MS)
    return () => window.clearTimeout(exitTimer.current)
  }, [leaving])

  const onCardAnimationEnd = (event: AnimationEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return
    if (event.animationName === 'avatar-reaction-out') finishExit()
  }

  if (!reaction) return null

  return (
    <div
      className="avatar-reaction"
      data-reaction={reaction}
      data-leaving={leaving}
      role="status"
      aria-live="polite"
    >
      <span className="avatar-reaction__glow" aria-hidden="true" />

      <div className="avatar-reaction__card" onAnimationEnd={onCardAnimationEnd}>
        <canvas className="avatar-reaction__canvas" ref={canvasRef} aria-hidden="true" />
        <p className="avatar-reaction__caption">{CAPTION[reaction]}</p>
        <button
          type="button"
          className="avatar-reaction__close"
          onClick={() => setLeaving(true)}
          aria-label="Ocultar la reacción"
          data-cursor="CERRAR"
        >
          ×
        </button>
      </div>

      {/* Después de la tarjeta a propósito: así salen por encima y se ven */}
      {!leaving &&
        SPARKS.map((spark) => (
          <span className="avatar-reaction__spark" key={`${cue?.id}-${spark}`} aria-hidden="true" />
        ))}
    </div>
  )
}
