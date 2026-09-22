import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { gsap, ScrollTrigger } from '@/animations/gsap'
import { useGsapContext } from '@/hooks/useGsapContext'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useIsTouchDevice } from '@/hooks/useIsTouchDevice'
import { useSound } from '@/audio/soundContext'
import { playBlip, playShimmer } from '@/audio/soundEngine'
import { KineticText } from '@/components/KineticText/KineticText'
import { SectionHeading } from '@/components/SectionHeading/SectionHeading'
import { ErrorBoundary } from '@/components/ErrorBoundary/ErrorBoundary'
import { mindNodes } from '@/data/mind'
import { softSkills } from '@/data/softSkills'
import { isWebGLAvailable } from '@/three/webgl'
import type { BrainAnchor } from '@/three/brain/types'
import type { MindItem } from '@/types/mind'
import { MindPanel } from './MindPanel'
import './Mind.css'

// Three.js solo se descarga cuando la sección está cerca
const BrainScene = lazy(() => import('@/three/brain/BrainScene'))

type Side = 'left' | 'right'

// Región = índice global: primero el hemisferio izquierdo (lo técnico), luego el derecho (lo humano)
const LEFT: MindItem[] = mindNodes
const RIGHT: MindItem[] = softSkills.map((s) => ({
  id: s.id,
  label: s.name,
  short: s.short,
  description: s.description,
  effect: s.effect,
}))
const sideOf = (region: number): Side => (region < LEFT.length ? 'left' : 'right')
const itemOf = (region: number) => (region < LEFT.length ? LEFT[region] : RIGHT[region - LEFT.length])
const pad = (n: number) => String(n).padStart(2, '0')

const COLUMNS: { side: Side; kicker: string; title: string; items: MindItem[]; offset: number }[] = [
  { side: 'left', kicker: 'Hemisferio izquierdo', title: 'Lo técnico', items: LEFT, offset: 0 },
  { side: 'right', kicker: 'Hemisferio derecho', title: 'Lo humano', items: RIGHT, offset: LEFT.length },
]

export function Mind() {
  const sectionRef = useRef<HTMLElement>(null)
  const layoutRef = useRef<HTMLDivElement>(null)
  const brainRef = useRef<HTMLDivElement>(null)
  const hudRef = useRef<HTMLParagraphElement>(null)
  const drawPathRef = useRef<SVGPathElement>(null)
  const flowPathRef = useRef<SVGPathElement>(null)
  const dotRef = useRef<SVGCircleElement>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])
  const anchorRef = useRef<BrainAnchor>({ x: 0, y: 0, visible: false })
  const introRef = useRef(0)
  const lastBlipRef = useRef(0)
  const scannedRef = useRef(false)

  const [near, setNear] = useState(false)
  const [visible, setVisible] = useState(false)
  const [webgl] = useState(isWebGLAvailable)
  const [hovered, setHovered] = useState<number | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [mobileSide, setMobileSide] = useState<Side>('left')

  const prefersReducedMotion = usePrefersReducedMotion()
  const wide = useMediaQuery('(min-width: 1200px)')
  const isTouch = useIsTouchDevice()
  const { enabled: soundEnabled } = useSound()

  const active = hovered ?? selected
  const highlighted = useMemo(() => (active !== null ? [active] : []), [active])
  const lit = new Set(highlighted)

  // Montar el 3D al acercarse; pausarlo (y cerrar la ficha) al salir de pantalla
  useEffect(() => {
    const brain = brainRef.current
    if (!brain) return
    const nearObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setNear(true)
      },
      { rootMargin: '150% 0px' }
    )
    const visibleObserver = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.isIntersecting)
        if (!entry.isIntersecting) {
          setSelected(null)
          setHovered(null)
        }
      },
      { rootMargin: '80px 0px' }
    )
    nearObserver.observe(brain)
    visibleObserver.observe(brain)
    return () => {
      nearObserver.disconnect()
      visibleObserver.disconnect()
    }
  }, [])

  // Escaneo de entrada ligado al scroll
  useGsapContext(
    () => {
      const brain = brainRef.current
      const hud = hudRef.current
      if (!brain || !hud) return
      if (prefersReducedMotion) {
        introRef.current = 1
        hud.textContent = 'Actividad neuronal · en línea'
        return
      }

      // Las tarjetas vuelan desde cada lado hacia el cerebro.
      // fromTo (no from): las tarjetas tienen transiciones CSS, y `from` leería un valor a
      // medio transicionar como estado final. clearProps devuelve el transform al CSS (hover).
      ;(['left', 'right'] as const).forEach((side) => {
        gsap.fromTo(
          `.mind__column--${side} .mind__item`,
          { x: side === 'left' ? -48 : 48, opacity: 0 },
          {
            x: 0,
            opacity: 1,
            duration: 0.7,
            stagger: 0.05,
            ease: 'power3.out',
            clearProps: 'transform,opacity',
            scrollTrigger: { trigger: `.mind__column--${side}`, start: 'top 85%', once: true },
          }
        )
      })

      ScrollTrigger.create({
        trigger: brain,
        start: 'top 85%',
        end: 'center 55%',
        onUpdate: (self) => {
          introRef.current = self.progress
          const pct = Math.round(self.progress * 100)
          hud.textContent = pct < 100 ? `Escaneando mente · ${pad(pct)}%` : 'Actividad neuronal · en línea'
          if (self.progress > 0.98 && !scannedRef.current) {
            scannedRef.current = true
            if (soundEnabled) playShimmer()
          } else if (self.progress < 0.5) {
            scannedRef.current = false
          }
        },
      })
    },
    [prefersReducedMotion, soundEnabled],
    sectionRef
  )

  // Cable de luz entre la etiqueta activa y su región en el cerebro (solo con las 3 columnas)
  useEffect(() => {
    if (!wide || active === null) return
    let raf = 0
    const draw = () => {
      const layout = layoutRef.current
      const brain = brainRef.current
      const item = itemRefs.current[active]
      const anchor = anchorRef.current
      const paths = [drawPathRef.current, flowPathRef.current]
      const dot = dotRef.current
      if (layout && brain && item && dot && anchor.visible) {
        const L = layout.getBoundingClientRect()
        const C = brain.getBoundingClientRect()
        const B = item.getBoundingClientRect()
        const ax = C.left - L.left + anchor.x
        const ay = C.top - L.top + anchor.y
        const fromLeft = sideOf(active) === 'left'
        const sx = fromLeft ? B.right - L.left + 6 : B.left - L.left - 6
        const sy = B.top - L.top + B.height / 2
        const mx = (sx + ax) / 2
        const d = `M ${sx} ${sy} C ${mx} ${sy}, ${mx} ${ay}, ${ax} ${ay}`
        paths.forEach((p) => p?.setAttribute('d', d))
        dot.setAttribute('cx', String(ax))
        dot.setAttribute('cy', String(ay))
      }
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [wide, active])

  const hover = useCallback(
    (region: number | null) => {
      setHovered(region)
      if (region === null || !soundEnabled) return
      const now = performance.now()
      if (now - lastBlipRef.current > 90) {
        lastBlipRef.current = now
        playBlip()
      }
    },
    [soundEnabled]
  )

  const select = useCallback(
    (region: number | null) => {
      setSelected(region)
      if (region === null) return
      setMobileSide(sideOf(region))
      if (soundEnabled) playShimmer()
    },
    [soundEnabled]
  )

  // Anterior / siguiente dentro del mismo hemisferio
  const step = useCallback(
    (region: number, delta: number) => {
      const left = sideOf(region) === 'left'
      const offset = left ? 0 : LEFT.length
      const count = left ? LEFT.length : RIGHT.length
      select(offset + ((region - offset + delta + count) % count))
    },
    [select]
  )

  useEffect(() => {
    if (selected === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') select(null)
      else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') step(selected, 1)
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') step(selected, -1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected, select, step])

  const selectedItem = selected !== null ? itemOf(selected) : null
  const selectedSide = selected !== null ? sideOf(selected) : 'left'

  return (
    <section className="mind" id="section-mente" ref={sectionRef} aria-label="Mi mente">
      <div className="mind__header">
        <SectionHeading number="02" label="Mi Mente" />
        <KineticText
          className="mind__headline"
          text="Dos hemisferios, una sola mente."
          accent={['mente.']}
        />
        <p className="mind__hint">
          {isTouch
            ? 'Toca una idea y mira en qué parte de mi cerebro vive.'
            : 'Pasa el cursor por una idea y mira en qué parte de mi cerebro vive.'}
        </p>
      </div>

      <div className="mind__layout" ref={layoutRef} data-panel={selected !== null}>
        <div className="mind__tabs" role="tablist" aria-label="Hemisferio">
          {COLUMNS.map((col) => (
            <button
              key={col.side}
              role="tab"
              aria-selected={mobileSide === col.side}
              className="mind__tab"
              data-side={col.side}
              onClick={() => setMobileSide(col.side)}
            >
              {col.title}
            </button>
          ))}
        </div>

        {COLUMNS.map((col) => (
          <div
            key={col.side}
            className={`mind__column mind__column--${col.side}`}
            data-hidden={mobileSide !== col.side}
          >
            <p className="mind__column-kicker">{col.kicker}</p>
            <h3 className="mind__column-title">{col.title}</h3>
            <ul className="mind__list">
              {col.items.map((item, i) => {
                const region = col.offset + i
                const isActive = lit.has(region)
                return (
                  <li key={item.id}>
                    <button
                      ref={(el) => {
                        itemRefs.current[region] = el
                      }}
                      className={`mind__item${isActive ? ' is-active' : ''}${
                        highlighted.length > 0 && !isActive ? ' is-muted' : ''
                      }`}
                      aria-pressed={selected === region}
                      aria-describedby={`mind-short-${region}`}
                      onPointerEnter={() => hover(region)}
                      onPointerLeave={() => hover(null)}
                      onFocus={() => hover(region)}
                      onBlur={() => hover(null)}
                      onClick={() => select(selected === region ? null : region)}
                      data-cursor="EXPLORE"
                    >
                      <span className="mind__item-num">{pad(i + 1)}</span>
                      <span className="mind__item-label">{item.label}</span>
                      <span className="mind__item-short" id={`mind-short-${region}`}>
                        {item.short}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}

        <div className="mind__brain" ref={brainRef}>
          {webgl ? (
            near && (
              <ErrorBoundary fallback={<p className="mind__fallback">No se pudo cargar la vista 3D.</p>}>
                <Suspense fallback={<p className="mind__fallback mind__fallback--loading">Conectando neuronas…</p>}>
                  <BrainScene
                    leftCount={LEFT.length}
                    rightCount={RIGHT.length}
                    activeRegion={active}
                    highlighted={highlighted}
                    panelOpen={selected !== null}
                    effect={active !== null ? (itemOf(active).effect ?? 'pulse') : 'pulse'}
                    compact={!wide}
                    active={visible}
                    reducedMotion={prefersReducedMotion}
                    introRef={introRef}
                    anchorRef={anchorRef}
                    onHoverRegion={hover}
                    onSelectRegion={(region) => select(selected === region ? null : region)}
                  />
                </Suspense>
              </ErrorBoundary>
            )
          ) : (
            <p className="mind__fallback">Tu navegador no muestra 3D — explora mis ideas en las listas.</p>
          )}

          <p className="mind__hud" ref={hudRef} aria-hidden="true">
            Escaneando mente · 00%
          </p>
          <div className="mind__hemis" aria-hidden="true">
            <span>Lógica</span>
            <span>Humana</span>
          </div>

          {selectedItem && selected !== null && (
            <MindPanel
              item={selectedItem}
              side={selectedSide}
              index={selected - (selectedSide === 'left' ? 0 : LEFT.length)}
              total={selectedSide === 'left' ? LEFT.length : RIGHT.length}
              onClose={() => select(null)}
              onPrev={() => step(selected, -1)}
              onNext={() => step(selected, 1)}
            />
          )}
        </div>

        {wide && active !== null && (
          <svg className="mind__wire" data-side={sideOf(active)} aria-hidden="true">
            <path ref={drawPathRef} className="mind__wire-draw" pathLength={1} key={`draw-${active}`} />
            <path ref={flowPathRef} className="mind__wire-flow" />
            <circle ref={dotRef} r={5} className="mind__wire-dot" />
          </svg>
        )}
      </div>

    </section>
  )
}
