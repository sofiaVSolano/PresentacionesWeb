import { useEffect, useRef } from 'react'
import { useIsTouchDevice } from '@/hooks/useIsTouchDevice'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { CURSOR_LABEL_EVENT } from './cursorEvents'
import './CustomCursor.css'

const TRAIL = 8
/** Por encima de este tamaño un elemento no "atrae" al anillo (p. ej. un canvas grande) */
const MAGNET_MAX = 360

/**
 * Cursor de escritorio: punto exacto + estela tipo cometa. Sobre elementos con
 * `data-cursor="TEXTO"` aparece un anillo (atraído hacia el centro del elemento) y una
 * etiqueta pequeña al lado — nunca encima de lo que se está mirando.
 */
export function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)
  const labelRef = useRef<HTMLSpanElement>(null)
  const trailRefs = useRef<(HTMLSpanElement | null)[]>([])
  const layerRef = useRef<HTMLDivElement>(null)
  const isTouch = useIsTouchDevice()
  const reducedMotion = usePrefersReducedMotion()

  useEffect(() => {
    if (isTouch) return
    const dot = dotRef.current
    const ring = ringRef.current
    const label = labelRef.current
    const layer = layerRef.current
    if (!dot || !ring || !label || !layer) return

    document.body.classList.add('cursor-active')

    const pointer = { x: -100, y: -100 }
    const ringPos = { x: -100, y: -100 }
    const trail = Array.from({ length: TRAIL }, () => ({ x: -100, y: -100 }))
    let target: HTMLElement | null = null
    let canvasLabel: string | null = null
    let visible = false
    let raf = 0

    const setLabel = (text: string | null) => {
      const active = Boolean(text)
      if (text) label.textContent = text
      layer.dataset.active = String(active)
    }

    const tick = () => {
      // punto: posición exacta, sin retraso
      dot.style.transform = `translate3d(${pointer.x}px, ${pointer.y}px, 0)`

      // anillo: sigue al puntero, atraído hacia el centro del elemento interactivo
      let tx = pointer.x
      let ty = pointer.y
      if (target) {
        const r = target.getBoundingClientRect()
        if (r.width < MAGNET_MAX && r.height < MAGNET_MAX) {
          tx += (r.left + r.width / 2 - pointer.x) * 0.3
          ty += (r.top + r.height / 2 - pointer.y) * 0.3
        }
      }
      ringPos.x += (tx - ringPos.x) * 0.25
      ringPos.y += (ty - ringPos.y) * 0.25
      ring.style.transform = `translate3d(${ringPos.x}px, ${ringPos.y}px, 0)`

      // etiqueta al lado; se pasa a la izquierda cerca del borde derecho
      const flip = pointer.x > window.innerWidth - 160
      label.style.transform = `translate3d(${pointer.x + (flip ? -16 : 16)}px, ${pointer.y + 14}px, 0) translateX(${flip ? '-100%' : '0'})`

      // estela: cada punto persigue al anterior
      if (!reducedMotion) {
        let lead = pointer
        trail.forEach((p, i) => {
          p.x += (lead.x - p.x) * 0.42
          p.y += (lead.y - p.y) * 0.42
          const el = trailRefs.current[i]
          if (el) {
            const gap = Math.hypot(p.x - pointer.x, p.y - pointer.y)
            const scale = 1 - i / TRAIL
            el.style.transform = `translate3d(${p.x}px, ${p.y}px, 0) scale(${scale})`
            // la estela solo se ve en movimiento: al detenerse se funde con el punto
            el.style.opacity = String(Math.min(1, gap / 24) * (0.55 - i * 0.05))
          }
          lead = p
        })
      }
      raf = requestAnimationFrame(tick)
    }

    const onMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return
      pointer.x = event.clientX
      pointer.y = event.clientY
      if (!visible) {
        visible = true
        layer.dataset.visible = 'true'
        ringPos.x = pointer.x
        ringPos.y = pointer.y
        trail.forEach((p) => {
          p.x = pointer.x
          p.y = pointer.y
        })
      }
    }

    const onOver = (event: MouseEvent) => {
      const el = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-cursor]') ?? null
      target = el
      setLabel(el?.dataset.cursor ?? canvasLabel)
    }

    const onLeaveWindow = () => {
      visible = false
      layer.dataset.visible = 'false'
    }

    // pequeña onda en cada clic
    const onDown = (event: PointerEvent) => {
      if (event.pointerType === 'touch' || reducedMotion) return
      const ripple = document.createElement('span')
      ripple.className = 'cursor-ripple'
      ripple.style.left = `${event.clientX}px`
      ripple.style.top = `${event.clientY}px`
      ripple.addEventListener('animationend', () => ripple.remove())
      layer.appendChild(ripple)
    }

    // etiquetas pedidas desde un canvas 3D (ver setCursorLabel)
    const onCanvasLabel = (event: Event) => {
      canvasLabel = (event as CustomEvent<string | null>).detail
      if (!target) setLabel(canvasLabel)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerdown', onDown)
    document.addEventListener('mouseover', onOver)
    document.documentElement.addEventListener('mouseleave', onLeaveWindow)
    window.addEventListener(CURSOR_LABEL_EVENT, onCanvasLabel)
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      document.body.classList.remove('cursor-active')
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onDown)
      document.removeEventListener('mouseover', onOver)
      document.documentElement.removeEventListener('mouseleave', onLeaveWindow)
      window.removeEventListener(CURSOR_LABEL_EVENT, onCanvasLabel)
    }
  }, [isTouch, reducedMotion])

  if (isTouch) return null

  return (
    <div className="cursor" ref={layerRef} data-active="false" data-visible="false" aria-hidden="true">
      {Array.from({ length: TRAIL }, (_, i) => (
        <span
          key={i}
          className="cursor-trail"
          ref={(el) => {
            trailRefs.current[i] = el
          }}
        />
      ))}
      <div className="cursor-ring" ref={ringRef} />
      <div className="cursor-dot" ref={dotRef} />
      <span className="cursor-label" ref={labelRef} />
    </div>
  )
}
