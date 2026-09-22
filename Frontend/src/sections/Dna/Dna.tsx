import { lazy, Suspense, useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { ScrollTrigger } from '@/animations/gsap'
import { useGsapContext } from '@/hooks/useGsapContext'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useSound } from '@/audio/soundContext'
import { playBlip, playShimmer } from '@/audio/soundEngine'
import { KineticText } from '@/components/KineticText/KineticText'
import { SectionHeading } from '@/components/SectionHeading/SectionHeading'
import { ErrorBoundary } from '@/components/ErrorBoundary/ErrorBoundary'
import { skillCategories, techSkills } from '@/data/skills'
import { mindNodes } from '@/data/mind'
import { projects } from '@/data/projects'
import { isWebGLAvailable } from '@/three/webgl'
import type { DnaBead } from '@/three/dna/types'
import type { SkillCategory } from '@/types/skill'
import { DnaPanel } from './DnaPanel'
import './Dna.css'

// Three.js (~600 KB) solo se descarga cuando la sección está cerca
const DnaScene = lazy(() => import('@/three/dna/DnaScene'))

const CATEGORY_ORDER = Object.keys(skillCategories) as SkillCategory[]

// Las tecnologías agrupadas por categoría: cada categoría forma un "gen" continuo en la hélice
const orderedSkills = CATEGORY_ORDER.flatMap((cat) => techSkills.filter((s) => s.category === cat))
const beads: DnaBead[] = orderedSkills.map((s) => ({
  id: s.id,
  name: s.name,
  category: s.category,
  color: skillCategories[s.category].color,
}))

const areasFor = (id: string) => mindNodes.filter((n) => n.skills?.includes(id)).map((n) => n.label)
const projectsFor = (id: string, name: string) =>
  projects
    .filter((p) => p.technologies.some((t) => t === id || t.toLowerCase() === name.toLowerCase()))
    .map((p) => p.title)

export function Dna() {
  const sectionRef = useRef<HTMLElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const assembleRef = useRef(0)
  const scrollRef = useRef(0)
  const lastBlipRef = useRef(0)

  const [near, setNear] = useState(false)
  const [visible, setVisible] = useState(false)
  const [webgl] = useState(isWebGLAvailable)
  const [hovered, setHovered] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [category, setCategory] = useState<SkillCategory | null>(null)

  const prefersReducedMotion = usePrefersReducedMotion()
  const horizontal = useMediaQuery('(min-width: 900px)')
  const { enabled: soundEnabled } = useSound()

  // Montar el 3D al acercarse y pausar su render cuando no se ve
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

  // El scroll ensambla la hélice al entrar y le añade giro al atravesar la sección
  useGsapContext(
    () => {
      const section = sectionRef.current
      const stage = stageRef.current
      if (!section || !stage) return
      if (prefersReducedMotion) {
        assembleRef.current = 1
        return
      }
      ScrollTrigger.create({
        trigger: stage,
        start: 'top 92%',
        end: 'center 58%',
        onUpdate: (self) => {
          assembleRef.current = self.progress
        },
      })
      ScrollTrigger.create({
        trigger: section,
        start: 'top bottom',
        end: 'bottom top',
        onUpdate: (self) => {
          scrollRef.current = self.progress
        },
      })
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
      if (id !== null && soundEnabled) playShimmer()
    },
    [soundEnabled]
  )

  const selectedIndex = orderedSkills.findIndex((s) => s.id === selected)
  const step = (delta: number) => {
    const count = orderedSkills.length
    select(orderedSkills[(selectedIndex + delta + count) % count].id)
  }

  useEffect(() => {
    if (selectedIndex < 0) return
    const count = orderedSkills.length
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') select(null)
      else if (e.key === 'ArrowRight') select(orderedSkills[(selectedIndex + 1) % count].id)
      else if (e.key === 'ArrowLeft') select(orderedSkills[(selectedIndex - 1 + count) % count].id)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedIndex, select])

  const selectedSkill = selectedIndex >= 0 ? orderedSkills[selectedIndex] : null

  return (
    <section className="dna" id="section-adn" ref={sectionRef} aria-label="Mi ADN">
      <div className="dna__header">
        <div>
          <SectionHeading number="03" label="Mi ADN" />
          <KineticText
            className="dna__headline"
            text="El código del que estoy hecha."
            accent={['código']}
          />
        </div>

        <div className="dna__legend" role="group" aria-label="Filtrar por categoría">
          <button
            className="dna__legend-item"
            aria-pressed={category === null}
            onClick={() => setCategory(null)}
            data-cursor="ALL"
          >
            Todo
          </button>
          {CATEGORY_ORDER.map((cat) => (
            <button
              key={cat}
              className="dna__legend-item"
              aria-pressed={category === cat}
              onClick={() => setCategory(category === cat ? null : cat)}
              style={{ '--dna-color': skillCategories[cat].color } as CSSProperties}
              data-cursor="FILTER"
            >
              <span className="dna__legend-dot" aria-hidden="true" />
              {skillCategories[cat].label}
            </button>
          ))}
        </div>
      </div>

      <div className="dna__viewport">
        <div className="dna__stage" ref={stageRef}>
          {webgl ? (
            near && (
              <ErrorBoundary fallback={<p className="dna__fallback">No se pudo cargar la vista 3D — explora mi ADN en el índice.</p>}>
                <Suspense fallback={<p className="dna__loading">Secuenciando…</p>}>
                  <DnaScene
                    items={beads}
                    hovered={hovered}
                    selected={selected}
                    category={category}
                    horizontal={horizontal}
                    active={visible}
                    reducedMotion={prefersReducedMotion}
                    assembleRef={assembleRef}
                    scrollRef={scrollRef}
                    onHover={hover}
                    onSelect={(id) => select(selected === id ? null : id)}
                  />
                </Suspense>
              </ErrorBoundary>
            )
          ) : (
            <p className="dna__fallback">Tu navegador no muestra 3D — explora mi ADN en el índice.</p>
          )}
          <p className="dna__hint" aria-hidden="true">
            {horizontal ? 'Pasa el cursor por la hélice · clic para ver la ficha' : 'Toca una base o usa el índice'}
          </p>
        </div>

        {selectedSkill && (
          <DnaPanel
            skill={selectedSkill}
            index={selectedIndex}
            total={orderedSkills.length}
            areas={areasFor(selectedSkill.id)}
            projects={projectsFor(selectedSkill.id, selectedSkill.name)}
            onClose={() => select(null)}
            onPrev={() => step(-1)}
            onNext={() => step(1)}
          />
        )}
      </div>

      {/* Índice: alternativa accesible (teclado, lector de pantalla, sin WebGL) */}
      <nav className="dna__index" aria-label="Índice de tecnologías">
        {CATEGORY_ORDER.map((cat) => (
          <div
            className="dna__index-group"
            key={cat}
            style={{ '--dna-color': skillCategories[cat].color } as CSSProperties}
            data-dim={category !== null && category !== cat}
          >
            <h3 className="dna__index-title">
              <span className="dna__legend-dot" aria-hidden="true" />
              {skillCategories[cat].label}
            </h3>
            <ul>
              {orderedSkills
                .filter((s) => s.category === cat)
                .map((skill) => (
                  <li key={skill.id}>
                    <button
                      className="dna__index-item"
                      aria-pressed={selected === skill.id}
                      onClick={() => select(selected === skill.id ? null : skill.id)}
                      onPointerEnter={() => hover(skill.id)}
                      onPointerLeave={() => hover(null)}
                      onFocus={() => hover(skill.id)}
                      onBlur={() => hover(null)}
                      data-cursor="INFO"
                    >
                      {skill.name}
                    </button>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </nav>
    </section>
  )
}
