import { useEffect, useRef, type ReactNode } from 'react'
import { gsap, ScrollTrigger } from '@/animations/gsap'
import { FrameSequence, frameUrls } from '@/animations/frameSequence'
import { useGsapContext } from '@/hooks/useGsapContext'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { useIsTouchDevice } from '@/hooks/useIsTouchDevice'
import { useSound } from '@/audio/soundContext'
import { Sample } from '@/audio/sample'
import { curtainSound } from '@/data/audio'
import { KineticText } from '@/components/KineticText/KineticText'
import { SectionHeading } from '@/components/SectionHeading/SectionHeading'
import { PadiaTag } from '@/components/PadiaTag/PadiaTag'
import { profile } from '@/data/profile'
import './About.css'

/** Scroll (en alturas de pantalla) durante el que se abre el telón */
const CURTAIN_SCROLL = 1.3
/**
 * En pantallas verticales el recorte sigue a la muñequita. Medido sobre el video:
 * mientras tira de la cuerda ocupa x ≈ 0,15–0,45 del cuadro; al final, x ≈ 0,20–0,46.
 */
const FOCUS_START = 0.3
const FOCUS_END = 0.34

const PILLAR_ICONS: ReactNode[] = [
  // IA: núcleo con conexiones
  <svg viewBox="0 0 32 32" key="ai" aria-hidden="true">
    <circle cx="16" cy="16" r="5" />
    <path d="M16 3v6M16 23v6M3 16h6M23 16h6M7 7l4.5 4.5M20.5 20.5 25 25M25 7l-4.5 4.5M11.5 20.5 7 25" />
  </svg>,
  // Software: código
  <svg viewBox="0 0 32 32" key="sw" aria-hidden="true">
    <path d="m11 9-7 7 7 7M21 9l7 7-7 7M18 6l-4 20" />
  </svg>,
  // Investigación: lupa sobre documento
  <svg viewBox="0 0 32 32" key="rs" aria-hidden="true">
    <path d="M7 4h12l6 6v8M7 4v24h9M19 4v6h6M10 12h7M10 16h5" />
    <circle cx="22" cy="23" r="4" />
    <path d="m25 26 3 3" />
  </svg>,
]

const FACT_ICONS: Record<string, ReactNode> = {
  Ubicación: <path d="M16 29s9-8.5 9-15a9 9 0 0 0-18 0c0 6.5 9 15 9 15Z M16 17.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />,
  Formación: <path d="m3 12 13-6 13 6-13 6-13-6Z M8 14.5V21c0 2 3.6 4 8 4s8-2 8-4v-6.5 M29 12v8" />,
  Semillero: <path d="M16 28V16 M16 16c0-5 4-9 10-9 0 5-4 9-10 9Z M16 20c0-4-3-7-8-7 0 4 3 7 8 7Z" />,
  Idiomas: <path d="M4 7h14 M11 4v3 M15 7c-1.5 5-5 9-10 11 M8 11c1.5 3 4 5.5 7 7 M18 28l5-12 5 12 M19.8 24h6.4" />,
}

export function About() {
  const sectionRef = useRef<HTMLElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const figureRef = useRef<HTMLDivElement>(null)
  const introRef = useRef<HTMLDivElement>(null)
  const sequenceRef = useRef<FrameSequence | null>(null)
  const curtainRef = useRef<Sample | null>(null)
  const duckTimer = useRef(0)
  // en refs para que activar el sonido no rehaga las animaciones de la sección
  const soundEnabledRef = useRef(false)
  const duckMusicRef = useRef<(ducked: boolean) => void>(() => {})
  const prefersReducedMotion = usePrefersReducedMotion()
  const isTouch = useIsTouchDevice()
  const { enabled: soundEnabled, duckMusic } = useSound()

  // El propio sonido del video del telón
  useEffect(() => {
    if (prefersReducedMotion) return
    const curtain = new Sample(curtainSound)
    curtainRef.current = curtain
    return () => {
      window.clearTimeout(duckTimer.current)
      curtain.destroy()
      curtainRef.current = null
    }
  }, [prefersReducedMotion])

  useEffect(() => {
    soundEnabledRef.current = soundEnabled
    if (!soundEnabled) curtainRef.current?.stop()
  }, [soundEnabled])

  useEffect(() => {
    duckMusicRef.current = duckMusic
  }, [duckMusic])

  const facts = [
    { term: 'Ubicación', value: profile.location },
    {
      term: 'Formación',
      value: `${profile.education.degree} · ${profile.education.institution} · ${profile.education.detail}`,
    },
    // El semillero no se repite aquí: ya está como etiqueta viva junto a la bio
    { term: 'Idiomas', value: profile.languages.map((l) => `${l.name} (${l.level})`).join(' · ') },
  ]

  // Secuencia del telón: se descarga cuando la sección se acerca
  useEffect(() => {
    const canvas = canvasRef.current
    const section = sectionRef.current
    if (!canvas || !section) return
    const portrait = () => window.innerWidth / window.innerHeight < 1
    const sequence = new FrameSequence({
      canvas,
      urls: frameUrls('curtain'),
      portrait: 'cover',
      focusX: portrait() ? FOCUS_START : 0.5,
    })
    sequenceRef.current = sequence
    const resizeObserver = new ResizeObserver(() => sequence.resize())
    resizeObserver.observe(canvas)

    const near = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        void sequence.loadFirst().then(() => sequence.loadAll())
        near.disconnect()
      },
      { rootMargin: '200% 0px' }
    )
    near.observe(section)

    return () => {
      near.disconnect()
      resizeObserver.disconnect()
      sequence.destroy()
      sequenceRef.current = null
    }
  }, [])

  useGsapContext(
    () => {
      const section = sectionRef.current
      const intro = introRef.current
      const figure = figureRef.current
      if (!section || !intro || !figure) return

      const cards = section.querySelectorAll<HTMLElement>('[data-reveal]')
      const counters = section.querySelectorAll<HTMLElement>('[data-count]')
      const checks = section.querySelectorAll<SVGPathElement>('.about__check path')

      const setCounters = () =>
        counters.forEach((el) => {
          el.textContent = el.dataset.count ?? ''
        })

      if (prefersReducedMotion) {
        sequenceRef.current?.setFocusX(window.innerWidth / window.innerHeight < 1 ? FOCUS_END : 0.5)
        sequenceRef.current?.setProgress(1)
        sequenceRef.current?.loadAll()
        gsap.set(intro, { opacity: 0 })
        gsap.set(cards, { opacity: 1 })
        gsap.set(checks, { strokeDashoffset: 0 })
        setCounters()
        return
      }

      // 1 · El scroll abre el telón, con el sonido del propio video
      let curtainPlaying = false

      const startCurtain = () => {
        curtainPlaying = true
        curtainRef.current?.play()
        duckMusicRef.current(true)
        // la pista dura ~10 s; si llega al final sola, la música vuelve a su sitio
        window.clearTimeout(duckTimer.current)
        duckTimer.current = window.setTimeout(() => duckMusicRef.current(false), 10000)
      }

      const endCurtain = () => {
        if (!curtainPlaying) return
        curtainPlaying = false
        curtainRef.current?.stop(900) // se apaga despacio, no de golpe
        window.clearTimeout(duckTimer.current)
        duckMusicRef.current(false)
      }

      ScrollTrigger.create({
        trigger: section,
        start: 'top top',
        end: () => `+=${window.innerHeight * CURTAIN_SCROLL}`,
        scrub: true,
        onUpdate: (self) => {
          const p = self.progress
          const sequence = sequenceRef.current
          if (sequence) {
            if (window.innerWidth / window.innerHeight < 1) {
              sequence.setFocusX(FOCUS_START + (FOCUS_END - FOCUS_START) * gsap.parseEase('power2.inOut')(p))
            }
            sequence.setProgress(p)
          }
          intro.style.opacity = String(Math.max(0, 1 - p * 3))
          intro.style.transform = `translateY(${-p * 80}px)`

          if (!soundEnabledRef.current) return
          // arranca con el primer gesto de apertura y se rearma si se vuelve a subir
          if (p > 0.02 && !curtainPlaying) startCurtain()
          else if (p <= 0.01 && curtainPlaying) endCurtain()
        },
        onLeave: endCurtain,
        onLeaveBack: endCurtain,
      })

      // 2 · Cada tarjeta entra con su propio giro y desenfoque
      cards.forEach((card, i) => {
        const tilt = Number(card.dataset.reveal ?? 0) || (i % 2 === 0 ? -2.5 : 2.5)
        gsap.fromTo(
          card,
          { opacity: 0, y: 70, rotate: tilt, filter: 'blur(8px)' },
          {
            opacity: 1,
            y: 0,
            rotate: 0,
            filter: 'blur(0px)',
            duration: 0.9,
            ease: 'power3.out',
            // devuelve transform al CSS: si no, el estilo en línea anula el hover de las tarjetas
            clearProps: 'transform,filter',
            scrollTrigger: { trigger: card, start: 'top 88%', once: true },
          }
        )
      })

      // 3 · Las cifras cuentan hacia arriba
      counters.forEach((el) => {
        const target = Number(el.dataset.count)
        const proxy = { v: 0 }
        gsap.to(proxy, {
          v: target,
          duration: 1.6,
          ease: 'power2.out',
          scrollTrigger: { trigger: el, start: 'top 90%', once: true },
          onUpdate: () => {
            el.textContent = String(Math.round(proxy.v))
          },
        })
      })

      // 4 · Los checks se dibujan uno tras otro
      gsap.to(checks, {
        strokeDashoffset: 0,
        duration: 0.5,
        stagger: 0.18,
        ease: 'power2.out',
        scrollTrigger: { trigger: '.about__list', start: 'top 85%', once: true },
      })

      // 5 · La muñequita "respira" y sigue levemente al cursor
      gsap.to(figure, { scale: 1.012, duration: 3.4, ease: 'sine.inOut', repeat: -1, yoyo: true })
      if (isTouch) return
      const moveX = gsap.quickTo(figure, 'x', { duration: 1, ease: 'power3' })
      const moveY = gsap.quickTo(figure, 'y', { duration: 1, ease: 'power3' })
      const onMove = (event: PointerEvent) => {
        moveX((event.clientX / window.innerWidth - 0.5) * -14)
        moveY((event.clientY / window.innerHeight - 0.5) * -8)
      }
      window.addEventListener('pointermove', onMove)

      // Tarjetas de pilares con inclinación 3D siguiendo el cursor
      const pillars = section.querySelectorAll<HTMLElement>('.about__pillar')
      const cleanups: (() => void)[] = []
      pillars.forEach((card) => {
        const rx = gsap.quickTo(card, 'rotationX', { duration: 0.5, ease: 'power3' })
        const ry = gsap.quickTo(card, 'rotationY', { duration: 0.5, ease: 'power3' })
        const move = (e: PointerEvent) => {
          const r = card.getBoundingClientRect()
          ry(((e.clientX - r.left) / r.width - 0.5) * 14)
          rx(((e.clientY - r.top) / r.height - 0.5) * -14)
        }
        const leave = () => {
          rx(0)
          ry(0)
        }
        card.addEventListener('pointermove', move)
        card.addEventListener('pointerleave', leave)
        cleanups.push(() => {
          card.removeEventListener('pointermove', move)
          card.removeEventListener('pointerleave', leave)
        })
      })

      return () => {
        window.removeEventListener('pointermove', onMove)
        cleanups.forEach((fn) => fn())
      }
    },
    [prefersReducedMotion, isTouch],
    sectionRef
  )

  return (
    <section
      className="about"
      id="section-yo"
      ref={sectionRef}
      aria-label="Sobre mí"
      style={{ '--curtain-scroll': CURTAIN_SCROLL } as React.CSSProperties}
    >
      {/* Escenario fijo: el telón se abre y la muñequita se queda acompañando la lectura */}
      <div className="about__sticky">
        <div className="about__figure" ref={figureRef}>
          <canvas
            className="about__canvas"
            ref={canvasRef}
            role="img"
            aria-label={`Animación: el avatar de ${profile.fullName} abre un telón`}
          />
        </div>
        <div className="about__intro" ref={introRef} aria-hidden="true">
          <span className="about__intro-kicker">Detrás del telón</span>
          <span className="about__intro-title">01 — Yo</span>
          <span className="about__intro-hint">Sigue bajando</span>
        </div>
      </div>

      <div className="about__flow">
        <div className="about__spacer" aria-hidden="true" />

        <div className="about__content">
          <header className="about__head" data-reveal="-1">
            <SectionHeading number="01" label="Yo" />
            <KineticText
              className="about__headline"
              text="Entender el problema antes de escribir la solución."
              accent={['problema', 'solución.']}
            />
          </header>

          <article className="about__card about__card--intro" data-reveal="-3">
            <p className="about__card-kicker">Quién soy</p>
            <p className="about__intro-text">{profile.bio[0]}</p>
            <ul className="about__chips">
              <li>{profile.role}</li>
              <li>{profile.location}</li>
              <li className="about__chip--padia">
                <PadiaTag />
              </li>
            </ul>
          </article>

          <ul className="about__stats" aria-label="En cifras">
            {profile.stats.map((stat) => (
              <li className="about__card about__stat" key={stat.label} data-reveal="2">
                <span className="about__stat-value">
                  <span data-count={stat.value}>0</span>
                  {stat.suffix}
                </span>
                <span className="about__stat-label">{stat.label}</span>
              </li>
            ))}
          </ul>

          <div className="about__block">
            <p className="about__block-title">Mis tres ejes</p>
            <ul className="about__pillars">
              {profile.pillars.map((pillar, i) => (
                <li className="about__card about__pillar" key={pillar.label} data-reveal={i % 2 ? '3' : '-3'}>
                  <span className="about__pillar-num">{String(i + 1).padStart(2, '0')}</span>
                  <span className="about__pillar-icon">{PILLAR_ICONS[i % PILLAR_ICONS.length]}</span>
                  <h3 className="about__pillar-title">{pillar.label}</h3>
                  <p className="about__pillar-detail">{pillar.detail}</p>
                </li>
              ))}
            </ul>
          </div>

          <blockquote className="about__card about__quote" data-reveal="2">
            <svg className="about__quote-mark" viewBox="0 0 32 32" aria-hidden="true">
              <path d="M4 26V17c0-6 3.5-10.5 10-12l1 2.6C11.2 9 9.6 11.6 9.4 15H14v11H4Zm16 0V17c0-6 3.5-10.5 10-12l1 2.6c-3.8 1.4-5.4 4-5.6 7.4H30v11H20Z" />
            </svg>
            <p>{profile.bio[1]}</p>
          </blockquote>

          <div className="about__card about__list-card" data-reveal="-2">
            <p className="about__card-kicker">Así trabajo</p>
            <ul className="about__list">
              {profile.highlights.map((item) => (
                <li key={item}>
                  <svg className="about__check" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M5 12.5l4.5 4.5L19 7" pathLength={1} />
                  </svg>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <dl className="about__facts">
            {facts.map((fact) => (
              <div className="about__card about__fact" key={fact.term} data-reveal="1">
                <svg className="about__fact-icon" viewBox="0 0 32 32" aria-hidden="true">
                  {FACT_ICONS[fact.term]}
                </svg>
                <dt>{fact.term}</dt>
                <dd>{fact.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  )
}
