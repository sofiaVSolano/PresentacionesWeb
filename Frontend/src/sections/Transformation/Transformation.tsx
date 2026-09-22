import { useEffect, useRef } from 'react'
import { gsap } from '@/animations/gsap'
import { useGsapContext } from '@/hooks/useGsapContext'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { useSound } from '@/audio/soundContext'
import { playRevealChime } from '@/audio/soundEngine'
import { Sample } from '@/audio/sample'
import { videoFrames } from '@/data/videoFrames'
import { transformationSound, TRANSFORMATION_CUE } from '@/data/audio'
import { profile } from '@/data/profile'
import { FrameSequence, frameUrls } from '@/animations/frameSequence'
import './Transformation.css'

// Tramo del scroll (0 → 1) durante el que corre el video
const VIDEO_START = 0.04
const VIDEO_SPAN = 0.84
/** Convierte un instante del video (0 → 1) en progreso de scroll de la sección */
const atVideo = (t: number) => VIDEO_START + t * VIDEO_SPAN

// Textos sincronizados con lo que ocurre en el video (instantes en fracción del video)
const CAPTIONS = [
  { step: '01 · Real', text: 'Esta soy yo.', from: 0.02, to: 0.17 },
  { step: '02 · Código', text: 'Circuitos, datos y luz.', from: 0.22, to: 0.48 },
  { step: '03 · Digital', text: 'Mi versión digital despierta.', from: 0.55, to: 0.8 },
]

export function Transformation() {
  const sectionRef = useRef<HTMLElement>(null)
  const pinRef = useRef<HTMLDivElement>(null)
  const windowRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const vignetteRef = useRef<HTMLDivElement>(null)
  const kickerRef = useRef<HTMLParagraphElement>(null)
  const hudRef = useRef<HTMLDivElement>(null)
  const frameLabelRef = useRef<HTMLSpanElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const veilRef = useRef<HTMLDivElement>(null)
  const revealRef = useRef<HTMLParagraphElement>(null)
  const sequenceRef = useRef<FrameSequence | null>(null)
  const cueRef = useRef<Sample | null>(null)
  const duckTimer = useRef(0)
  // en refs para que activar el sonido no obligue a recrear el ScrollTrigger con pin
  const soundEnabledRef = useRef(false)
  const duckMusicRef = useRef<(ducked: boolean) => void>(() => {})

  const prefersReducedMotion = usePrefersReducedMotion()
  const { enabled: soundEnabled, duckMusic } = useSound()

  // Secuencia de fotogramas: el primero enseguida, el resto cuando la página ya cargó
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const sequence = new FrameSequence({ canvas, urls: frameUrls('transformation') })
    sequenceRef.current = sequence

    const resizeObserver = new ResizeObserver(() => sequence.resize())
    resizeObserver.observe(canvas)
    void sequence.loadFirst()

    let timer = 0
    const startFull = () => {
      timer = window.setTimeout(() => sequence.loadAll(), 400)
    }
    if (document.readyState === 'complete') startFull()
    else window.addEventListener('load', startFull, { once: true })

    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('load', startFull)
      resizeObserver.disconnect()
      sequence.destroy()
      sequenceRef.current = null
    }
  }, [])

  // El golpe de la transformación: un disparo, en su instante, a su velocidad
  useEffect(() => {
    if (prefersReducedMotion) return
    const cue = new Sample(transformationSound)
    cueRef.current = cue
    return () => {
      window.clearTimeout(duckTimer.current)
      cue.destroy()
      cueRef.current = null
    }
  }, [prefersReducedMotion])

  useEffect(() => {
    soundEnabledRef.current = soundEnabled
    if (!soundEnabled) cueRef.current?.stop()
  }, [soundEnabled])

  useEffect(() => {
    duckMusicRef.current = duckMusic
  }, [duckMusic])

  useGsapContext(
    () => {
      const section = sectionRef.current
      const pin = pinRef.current
      const win = windowRef.current
      const vignette = vignetteRef.current
      const kicker = kickerRef.current
      const hud = hudRef.current
      const bar = barRef.current
      const frameLabel = frameLabelRef.current
      const veil = veilRef.current
      const reveal = revealRef.current
      const captions = section?.querySelectorAll<HTMLElement>('.transformation__caption')
      if (!section || !pin || !win || !vignette || !kicker || !hud || !bar || !frameLabel || !veil || !reveal)
        return

      gsap.set(reveal, { xPercent: -50, yPercent: -50 })
      const total = videoFrames.transformation.count

      const showFrame = (progress: number) => {
        sequenceRef.current?.setProgress(progress)
        const frame = Math.round(progress * (total - 1)) + 1
        frameLabel.textContent = `Frame ${String(frame).padStart(3, '0')} / ${total}`
        bar.style.transform = `scaleX(${progress})`
      }

      if (prefersReducedMotion) {
        // Sin scrub: se muestra directamente el resultado final (el avatar) con la frase
        section.classList.add('is-static')
        win.style.clipPath = 'none'
        gsap.set([vignette, hud, kicker], { opacity: 0 })
        gsap.set(reveal, { opacity: 1, yPercent: 0 })
        showFrame(1)
        sequenceRef.current?.loadAll()
        return
      }

      const narrow = window.innerWidth < 640
      const insetX = narrow ? 6 : 18
      const insetY = narrow ? 18 : 14
      const opening = { v: 1 }
      const video = { p: 0 }
      const setWindow = () => {
        const v = opening.v
        win.style.clipPath = `inset(${insetY * v}% ${insetX * v}% ${insetY * v}% ${insetX * v}% round ${32 * v}px)`
      }
      setWindow()
      showFrame(0)

      let firedReveal = false
      let firedCue = false

      // Suena justo cuando la figura empieza a convertirse, y la música se aparta
      const fireCue = () => {
        cueRef.current?.play()
        duckMusicRef.current(true)
        window.clearTimeout(duckTimer.current)
        duckTimer.current = window.setTimeout(() => duckMusicRef.current(false), 2600)
      }

      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: 'bottom bottom',
          pin,
          scrub: 0.6,
          onUpdate: (self) => {
            if (!soundEnabledRef.current) return
            const p = self.progress

            if (p > atVideo(TRANSFORMATION_CUE) && !firedCue) {
              firedCue = true
              fireCue()
            } else if (p < atVideo(TRANSFORMATION_CUE - 0.05) && firedCue) {
              // se volvió a subir antes del cambio: queda rearmado para sonar otra vez
              firedCue = false
              cueRef.current?.stop()
            }

            if (p > 0.94 && !firedReveal) {
              firedReveal = true
              playRevealChime()
            } else if (p < 0.91 && firedReveal) firedReveal = false
          },
          onLeave: () => cueRef.current?.stop(),
          onLeaveBack: () => cueRef.current?.stop(),
        },
      })

      // 1 · La ventana se abre hasta ocupar toda la pantalla
      tl.to(opening, { v: 0, duration: 0.08, ease: 'power2.inOut', onUpdate: setWindow }, 0)
        .to(kicker, { opacity: 0, duration: 0.04 }, 0.04)
        .to(vignette, { opacity: 0, duration: 0.36 }, 0.04)

        // 2 · El video corre al ritmo del scroll
        .to(video, { p: 1, duration: VIDEO_SPAN, onUpdate: () => showFrame(video.p) }, VIDEO_START)

      // 3 · Textos sincronizados con el video
      captions?.forEach((caption, i) => {
        const { from, to } = CAPTIONS[i]
        tl.fromTo(
          caption,
          { opacity: 0, y: 14 },
          { opacity: 1, y: 0, duration: 0.03, ease: 'power2.out', immediateRender: false },
          atVideo(from)
        ).to(caption, { opacity: 0, y: -10, duration: 0.03, ease: 'power2.in' }, atVideo(to))
      })

      // 4 · Velo crema y frase final — enlaza con el fondo de la sección YO
      tl.to(hud, { opacity: 0, duration: 0.03 }, 0.88)
        .to(veil, { opacity: 1, duration: 0.06, ease: 'power1.inOut' }, 0.9)
        .fromTo(
          reveal,
          { opacity: 0, y: 18 },
          { opacity: 1, y: 0, duration: 0.06, ease: 'power3.out', immediateRender: false },
          0.94
        )
    },
    [prefersReducedMotion],
    sectionRef
  )

  return (
    <section className="transformation" ref={sectionRef} aria-label="Transformación">
      <div className="transformation__pin" ref={pinRef}>
        <div className="transformation__window" ref={windowRef}>
          <canvas
            className="transformation__canvas"
            ref={canvasRef}
            role="img"
            aria-label={`Video: la fotografía de ${profile.fullName} se transforma en su avatar digital`}
          />
          <div className="transformation__vignette" ref={vignetteRef} aria-hidden="true" />
        </div>

        <p className="text-kicker transformation__kicker" ref={kickerRef}>
          Transformación
        </p>

        <div className="transformation__captions" aria-hidden="true">
          {CAPTIONS.map((caption) => (
            <div className="transformation__caption" key={caption.step}>
              <span className="transformation__caption-step">{caption.step}</span>
              <p>{caption.text}</p>
            </div>
          ))}
        </div>

        <div className="transformation__hud" ref={hudRef} aria-hidden="true">
          <span ref={frameLabelRef} />
          <div className="transformation__bar">
            <div ref={barRef} />
          </div>
        </div>

        <div className="transformation__veil" ref={veilRef} aria-hidden="true" />
        <p className="transformation__reveal" ref={revealRef}>
          Ahora sí, entra a mi mundo.
        </p>
      </div>
    </section>
  )
}
