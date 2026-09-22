import { lazy, Suspense, useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { useLenis } from 'lenis/react'
import { gsap, ScrollTrigger } from '@/animations/gsap'
import { useGsapContext } from '@/hooks/useGsapContext'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useIsTouchDevice } from '@/hooks/useIsTouchDevice'
import { useSound } from '@/audio/soundContext'
import { playBlip, playWhooshRise } from '@/audio/soundEngine'
import { KineticText } from '@/components/KineticText/KineticText'
import { SectionHeading } from '@/components/SectionHeading/SectionHeading'
import { ErrorBoundary } from '@/components/ErrorBoundary/ErrorBoundary'
import { projects } from '@/data/projects'
import { isWebGLAvailable } from '@/three/webgl'
import type { UniversePlanet } from '@/three/universe/types'
import { isLive, PLANET_PALETTE, STATUS_LABEL } from './projectDisplay'
import { WorksPanel } from './WorksPanel'
import './Works.css'

// Three.js solo se descarga cuando la sección está cerca
const UniverseScene = lazy(() => import('@/three/universe/UniverseScene'))

const planets: UniversePlanet[] = projects.map((project, i) => {
  const [base, accent] = PLANET_PALETTE[i % PLANET_PALETTE.length]
  return {
    id: project.id,
    title: project.title,
    base,
    accent,
    // los destacados son más grandes; el resto varía un poco para que el sistema no sea uniforme
    size: project.featured ? 0.42 : 0.26 + ((i * 37) % 10) / 100,
    featured: project.featured,
    live: isLive(project),
  }
})

const pad = (n: number) => String(n).padStart(2, '0')

export function Works() {
  const sectionRef = useRef<HTMLElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const assembleRef = useRef(0)
  const lastBlipRef = useRef(0)

  const [near, setNear] = useState(false)
  const [visible, setVisible] = useState(false)
  const [webgl] = useState(isWebGLAvailable)
  const [hovered, setHovered] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)

  const prefersReducedMotion = usePrefersReducedMotion()
  const wide = useMediaQuery('(min-width: 1024px)')
  const compact = useMediaQuery('(max-width: 699px)')
  const isTouch = useIsTouchDevice()
  const { enabled: soundEnabled } = useSound()
  const lenis = useLenis()

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const nearObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setNear(true)
      },
      { rootMargin: '150% 0px' }
    )
    const visibleObserver = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      rootMargin: '80px 0px',
    })
    nearObserver.observe(stage)
    visibleObserver.observe(stage)
    return () => {
      nearObserver.disconnect()
      visibleObserver.disconnect()
    }
  }, [])

  useGsapContext(
    () => {
      const stage = stageRef.current
      if (!stage) return
      if (prefersReducedMotion) {
        assembleRef.current = 1
        return
      }
      // Big bang: los planetas salen del núcleo y ocupan sus órbitas con el scroll
      ScrollTrigger.create({
        trigger: stage,
        start: 'top 90%',
        end: 'center 55%',
        onUpdate: (self) => {
          assembleRef.current = self.progress
        },
      })
      gsap.fromTo(
        '.works__card',
        { x: -30, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 0.7,
          stagger: 0.06,
          ease: 'power3.out',
          clearProps: 'transform,opacity',
          scrollTrigger: { trigger: '.works__index', start: 'top 85%', once: true },
        }
      )
    },
    [prefersReducedMotion],
    sectionRef
  )

  const hover = useCallback(
    (id: string | null) => {
      setHovered(id)
      if (id === null || !soundEnabled) return
      const now = performance.now()
      if (now - lastBlipRef.current > 90) {
        lastBlipRef.current = now
        playBlip()
      }
    },
    [soundEnabled]
  )

  const select = useCallback(
    (id: string | null) => {
      setSelected(id)
      if (id !== null && soundEnabled) playWhooshRise()
    },
    [soundEnabled]
  )

  const selectedIndex = projects.findIndex((p) => p.id === selected)
  const step = (delta: number) => {
    const n = projects.length
    select(projects[(selectedIndex + delta + n) % n].id)
  }

  useEffect(() => {
    if (selectedIndex < 0) return
    const n = projects.length
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') select(null)
      else if (e.key === 'ArrowRight') select(projects[(selectedIndex + 1) % n].id)
      else if (e.key === 'ArrowLeft') select(projects[(selectedIndex - 1 + n) % n].id)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedIndex, select])

  // Desde la lista: la cámara vuela al planeta. En pantallas estrechas la lista queda bajo
  // el universo, así que primero se sube hasta él.
  const openFromIndex = (id: string) => {
    select(selected === id ? null : id)
    const stage = stageRef.current
    if (!stage || wide) return
    const offset = -(window.innerHeight - stage.offsetHeight) / 2
    if (lenis) lenis.scrollTo(stage, { offset })
    else stage.scrollIntoView({ block: 'center' })
  }

  const selectedProject = selectedIndex >= 0 ? projects[selectedIndex] : null

  return (
    <section className="works" id="section-creaciones" ref={sectionRef} aria-label="Creaciones">
      <div className="works__header">
        <SectionHeading number="04" label="Creaciones" />
        <KineticText className="works__headline" text="Cada proyecto, un mundo propio." accent={['mundo']} />
        <p className="works__hint">
          {isTouch
            ? 'Elige un mundo de la lista o toca un planeta para viajar hasta él.'
            : 'Elige un mundo de la lista —o haz clic en un planeta— y la nave te lleva hasta él.'}
        </p>
      </div>

      <div className="works__explorer">
        {/* Lista de mundos: al elegir uno la cámara vuela hasta su planeta.
            También es la vía accesible (teclado, lector de pantalla, sin WebGL) */}
        <nav className="works__index-wrap" aria-label="Todos los proyectos">
          <p className="works__index-kicker">
            {projects.length} mundos · elige uno para viajar
          </p>
          <ul className="works__index" data-lenis-prevent>
            {projects.map((project, i) => {
              const planet = planets[i]
              return (
                <li key={project.id}>
                  <button
                    className="works__card"
                    style={{ '--planet': planet.base, '--planet-accent': planet.accent } as CSSProperties}
                    aria-pressed={selected === project.id}
                    onClick={() => openFromIndex(project.id)}
                    onPointerEnter={() => hover(project.id)}
                    onPointerLeave={() => hover(null)}
                    onFocus={() => hover(project.id)}
                    onBlur={() => hover(null)}
                    data-cursor="TRAVEL"
                  >
                    <span className="works__card-orb" aria-hidden="true" />
                    <span className="works__card-num">{pad(i + 1)}</span>
                    <span className="works__card-title">{project.title}</span>
                    <span className="works__card-status">
                      {planet.live && <i aria-hidden="true" />}
                      {planet.live ? 'LIVE' : STATUS_LABEL[project.status]}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="works__stage" ref={stageRef} data-open={selected !== null}>
          {webgl ? (
            near && (
              <ErrorBoundary fallback={<p className="works__fallback">No se pudo cargar el universo 3D — elige un proyecto de la lista.</p>}>
                <Suspense fallback={<p className="works__fallback works__fallback--loading">Abriendo el universo…</p>}>
                  <UniverseScene
                    planets={planets}
                    hovered={hovered}
                    selected={selected}
                    compact={compact}
                    sidePanel={wide}
                    active={visible}
                    reducedMotion={prefersReducedMotion}
                    assembleRef={assembleRef}
                    onHover={hover}
                    onSelect={select}
                  />
                </Suspense>
              </ErrorBoundary>
            )
          ) : (
            <p className="works__fallback">Tu navegador no muestra 3D — elige un proyecto de la lista.</p>
          )}

          <p className="works__hud" aria-hidden="true">
            {selectedProject ? `Aterrizando en ${selectedProject.title}` : 'Órbita estable'}
          </p>

          {selectedProject && (
            <WorksPanel
              project={selectedProject}
              color={planets[selectedIndex].base}
              index={selectedIndex}
              total={projects.length}
              onClose={() => select(null)}
              onPrev={() => step(-1)}
              onNext={() => step(1)}
            />
          )}
        </div>
      </div>
    </section>
  )
}
