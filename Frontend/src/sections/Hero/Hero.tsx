import { useRef } from 'react'
import { gsap } from '@/animations/gsap'
import { useGsapContext } from '@/hooks/useGsapContext'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { useIsTouchDevice } from '@/hooks/useIsTouchDevice'
import { ParticleField } from '@/components/ParticleField/ParticleField'
import { ScrollIndicator } from '@/components/ScrollIndicator/ScrollIndicator'
import { Marquee } from '@/components/Marquee/Marquee'
import { profile } from '@/data/profile'
import './Hero.css'

const MARQUEE_ITEMS = [
  'PORTAFOLIO INTERACTIVO',
  'INGENIERÍA DE SISTEMAS',
  'INTELIGENCIA ARTIFICIAL',
  'DESARROLLO DE SOFTWARE',
]

interface HeroProps {
  /** true una vez el Preloader terminó — dispara la animación de entrada */
  ready: boolean
}

export function Hero({ ready }: HeroProps) {
  const sectionRef = useRef<HTMLElement>(null)
  const portraitWrapRef = useRef<HTMLDivElement>(null)
  const portraitImgRef = useRef<HTMLImageElement>(null)
  const glowRef = useRef<HTMLDivElement>(null)
  const prefersReducedMotion = usePrefersReducedMotion()
  const isTouch = useIsTouchDevice()

  // Animación de entrada: se dispara una vez, cuando el Preloader termina.
  useGsapContext(
    () => {
      const section = sectionRef.current
      if (!section || !ready) return

      const words = section.querySelectorAll('.hero__title-word')
      const eyebrowLine = section.querySelector('.hero__eyebrow-line')
      const subtitle = section.querySelector('.hero__subtitle')
      const tagline = section.querySelector('.hero__tagline')
      const portraitFrame = section.querySelector('.hero__portrait-frame')

      if (prefersReducedMotion) {
        gsap.set([subtitle, tagline, portraitFrame], { opacity: 1 })
        gsap.set(words, { y: 0 })
        gsap.set(eyebrowLine, { scaleX: 1 })
        return
      }

      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
      tl.to(eyebrowLine, { scaleX: 1, duration: 0.5 })
        .to(words, { y: 0, duration: 0.85, stagger: 0.09 }, '-=0.2')
        .to(subtitle, { opacity: 1, duration: 0.6 }, '-=0.5')
        .to(tagline, { opacity: 1, duration: 0.6 }, '-=0.4')
        .fromTo(
          portraitFrame,
          { opacity: 0, scale: 1.06, filter: 'blur(16px)' },
          { opacity: 1, scale: 1, filter: 'blur(0px)', duration: 1.2 },
          0.2
        )
    },
    [ready, prefersReducedMotion],
    sectionRef
  )

  // Parallax + zoom continuo — independiente de la animación de entrada.
  useGsapContext(
    () => {
      if (prefersReducedMotion) return
      const section = sectionRef.current
      const portrait = portraitWrapRef.current
      const image = portraitImgRef.current
      const glow = glowRef.current
      if (!section || !portrait || !image || !glow) return

      gsap.to(image, {
        scale: 1.045,
        duration: 22,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
      })

      if (isTouch) return

      const movePortrait = gsap.quickTo(portrait, 'x', { duration: 0.6, ease: 'power3' })
      const movePortraitY = gsap.quickTo(portrait, 'y', { duration: 0.6, ease: 'power3' })
      const moveGlow = gsap.quickTo(glow, 'x', { duration: 0.9, ease: 'power3' })
      const moveGlowY = gsap.quickTo(glow, 'y', { duration: 0.9, ease: 'power3' })

      const handlePointerMove = (event: PointerEvent) => {
        const rect = section.getBoundingClientRect()
        const relX = (event.clientX - rect.left) / rect.width - 0.5
        const relY = (event.clientY - rect.top) / rect.height - 0.5

        movePortrait(relX * 16)
        movePortraitY(relY * 12)
        moveGlow(relX * -30)
        moveGlowY(relY * -30)
      }

      section.addEventListener('pointermove', handlePointerMove)
      return () => section.removeEventListener('pointermove', handlePointerMove)
    },
    [prefersReducedMotion, isTouch],
    sectionRef
  )

  return (
    <section className="hero" ref={sectionRef} aria-label="Presentación">
      <div className="hero__glow" ref={glowRef} aria-hidden="true" />
      <ParticleField count={isTouch ? 10 : 22} />

      <div className="hero__top-marquee">
        <Marquee items={MARQUEE_ITEMS} duration={28} />
      </div>

      <p className="hero__corner-label">{profile.location}</p>

      <div className="hero__main">
        <div className="hero__grid">
          <div className="hero__intro">
            <p className="text-kicker hero__eyebrow">
              <span className="hero__eyebrow-line" />
              Portafolio interactivo
            </p>
            <h1 className="hero__title">
              <span className="hero__title-mask">
                <span className="hero__title-word">Hola,</span>
              </span>{' '}
              <span className="hero__title-mask">
                <span className="hero__title-word">soy</span>
              </span>{' '}
              <span className="hero__title-mask">
                <span className="hero__title-word hero__title-name">{profile.displayName}</span>
              </span>
            </h1>
            <p className="text-body-lg hero__subtitle">{profile.heroSubtitle}</p>
            <p className="text-body hero__tagline">{profile.tagline}</p>
          </div>

          <div className="hero__portrait-wrap" ref={portraitWrapRef}>
            <div className="hero__portrait-frame">
              <div className="hero__portrait-halo" aria-hidden="true" />
              <div className="hero__orbit" aria-hidden="true" />
              <img
                ref={portraitImgRef}
                className="hero__portrait"
                src="/assets/character/sofia-real-cutout.png"
                alt={`Fotografía de ${profile.fullName}`}
                fetchPriority="high"
              />
              <div className="hero__portrait-ground" aria-hidden="true" />
            </div>
          </div>
        </div>
      </div>

      <ScrollIndicator />
    </section>
  )
}
