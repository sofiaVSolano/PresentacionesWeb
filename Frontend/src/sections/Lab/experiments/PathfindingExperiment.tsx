import { useCallback, useEffect, useRef, useState } from 'react'
import { useInView } from '@/hooks/useInView'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { useSound } from '@/audio/soundContext'
import { playBlip, playShimmer } from '@/audio/soundEngine'
import { LabModule } from '../LabModule'
import { getContext, useCanvasSize } from '../useCanvas'
import { createWorld, randomWalls, search, type Algorithm, type World } from '../lib/pathfinding'

const ALGORITHMS: Record<Algorithm, { label: string; note: string; color: string }> = {
  dp: { label: 'Programación dinámica', note: 'Garantiza la ruta más corta', color: '158, 38, 55' },
  greedy: { label: 'Greedy Best-First', note: 'Va directo a la meta', color: '111, 182, 201' },
}

interface Stats {
  explored: number
  length: number | null
}

interface Animation {
  algorithm: Algorithm
  visited: number[]
  path: number[]
  shown: number
}

export function PathfindingExperiment() {
  const compact = useMediaQuery('(max-width: 699px)')
  const cols = compact ? 16 : 30
  const rows = compact ? 15 : 13
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const size = useCanvasSize(canvasRef)
  const visible = useInView(wrapRef, '100px')
  const prefersReducedMotion = usePrefersReducedMotion()
  const { enabled: soundEnabled } = useSound()

  const [algorithm, setAlgorithm] = useState<Algorithm>('greedy')
  const [running, setRunning] = useState(false)
  const [stats, setStats] = useState<Partial<Record<Algorithm, Stats>>>({})
  const world = useRef<World>(createWorld(cols, rows))
  const anim = useRef<Animation | null>(null)
  const dirty = useRef(true)
  const drag = useRef<'start' | 'goal' | 'draw' | 'erase' | null>(null)

  useEffect(() => {
    world.current = createWorld(cols, rows)
    anim.current = null
    dirty.current = true
  }, [cols, rows])

  const draw = useCallback(() => {
    const ctx = getContext(canvasRef.current, size)
    if (!ctx) return
    const { cols: c, rows: r, walls, start, goal } = world.current
    const cell = size.w / c
    ctx.clearRect(0, 0, size.w, size.h)

    ctx.strokeStyle = 'rgba(243, 231, 220, 0.05)'
    ctx.lineWidth = 1
    for (let x = 0; x <= c; x++) {
      ctx.beginPath()
      ctx.moveTo(x * cell, 0)
      ctx.lineTo(x * cell, r * cell)
      ctx.stroke()
    }
    for (let y = 0; y <= r; y++) {
      ctx.beginPath()
      ctx.moveTo(0, y * cell)
      ctx.lineTo(c * cell, y * cell)
      ctx.stroke()
    }

    const box = (i: number, pad = 1) => [(i % c) * cell + pad, Math.floor(i / c) * cell + pad, cell - pad * 2, cell - pad * 2] as const

    const a = anim.current
    if (a) {
      const rgb = ALGORITHMS[a.algorithm].color
      const visitedShown = Math.min(a.shown, a.visited.length)
      for (let k = 0; k < visitedShown; k++) {
        // las más recientes brillan más: se ve el "frente" de la búsqueda avanzar
        const age = (visitedShown - k) / 40
        ctx.fillStyle = `rgba(${rgb}, ${Math.max(0.28, 0.85 - age)})`
        ctx.fillRect(...box(a.visited[k], 1.5))
      }
      const pathShown = Math.max(0, a.shown - a.visited.length)
      ctx.fillStyle = '#f3e7dc'
      for (let k = 0; k < Math.min(pathShown, a.path.length); k++) ctx.fillRect(...box(a.path[k], cell * 0.22))
    }

    ctx.fillStyle = 'rgba(243, 231, 220, 0.82)'
    for (let i = 0; i < walls.length; i++) if (walls[i]) ctx.fillRect(...box(i, 0.5))

    const center = (i: number) => [(i % c) * cell + cell / 2, Math.floor(i / c) * cell + cell / 2] as const
    const [sx, sy] = center(start)
    ctx.fillStyle = '#d6708a'
    ctx.beginPath()
    ctx.arc(sx, sy, cell * 0.36, 0, Math.PI * 2)
    ctx.fill()
    const [gx, gy] = center(goal)
    ctx.strokeStyle = '#f3e7dc'
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.arc(gx, gy, cell * 0.34, 0, Math.PI * 2)
    ctx.stroke()
    ctx.fillStyle = '#f3e7dc'
    ctx.beginPath()
    ctx.arc(gx, gy, cell * 0.12, 0, Math.PI * 2)
    ctx.fill()
  }, [size])

  useEffect(() => {
    dirty.current = true
  }, [size])

  // Un único bucle de dibujo, activo solo mientras el módulo está en pantalla
  useEffect(() => {
    if (!visible) return
    let raf = 0
    const tick = () => {
      const a = anim.current
      if (a) {
        const total = a.visited.length + a.path.length
        if (a.shown < total) {
          a.shown = Math.min(total, a.shown + (a.shown < a.visited.length ? 4 : 1))
          dirty.current = true
          if (a.shown === total) {
            setRunning(false)
            if (soundEnabled && a.path.length) playShimmer()
          }
        }
      }
      if (dirty.current) {
        draw()
        dirty.current = false
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [visible, draw, soundEnabled])

  const run = () => {
    const result = search(algorithm, world.current)
    setStats((prev) => ({
      ...prev,
      [algorithm]: { explored: result.visited.length, length: result.path.length ? result.path.length - 1 : null },
    }))
    const total = result.visited.length + result.path.length
    anim.current = { algorithm, ...result, shown: prefersReducedMotion ? total : 0 }
    setRunning(!prefersReducedMotion)
    dirty.current = true
    if (soundEnabled) playBlip()
  }

  const edit = (next: World) => {
    world.current = next
    anim.current = null
    setRunning(false)
    setStats({})
    dirty.current = true
  }

  const cellAt = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const { cols: c, rows: r } = world.current
    const x = Math.floor(((event.clientX - rect.left) / rect.width) * c)
    const y = Math.floor(((event.clientY - rect.top) / rect.height) * r)
    if (x < 0 || y < 0 || x >= c || y >= r) return -1
    return y * c + x
  }

  const apply = (i: number) => {
    const w = world.current
    const mode = drag.current
    if (i < 0 || !mode) return
    if (mode === 'start' && i !== w.goal && !w.walls[i]) edit({ ...w, start: i })
    else if (mode === 'goal' && i !== w.start && !w.walls[i]) edit({ ...w, goal: i })
    else if ((mode === 'draw' || mode === 'erase') && i !== w.start && i !== w.goal) {
      const value = mode === 'draw' ? 1 : 0
      if (w.walls[i] === value) return
      const walls = w.walls.slice()
      walls[i] = value
      edit({ ...w, walls })
    }
  }

  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const i = cellAt(event)
    if (i < 0) return
    const w = world.current
    drag.current = i === w.start ? 'start' : i === w.goal ? 'goal' : w.walls[i] ? 'erase' : 'draw'
    if (event.pointerType === 'mouse') event.currentTarget.setPointerCapture(event.pointerId)
    apply(i)
  }

  const results = (Object.keys(ALGORITHMS) as Algorithm[]).filter((k) => stats[k])

  return (
    <LabModule
      code="EXP-01"
      title="Búsqueda de rutas"
      running={running}
      wide
      context={
        <>
          El tema de mi artículo para <strong>IEEE (Amitic 2025)</strong>: comparar programación dinámica y Greedy
          Best-First en la planeación de rutas de robots móviles. Dibuja muros, mueve el inicio y la meta, y compáralos.
        </>
      }
    >
      <div className="lab__body lab__body--path" ref={wrapRef}>
        <canvas
          ref={canvasRef}
          className="lab__canvas lab__canvas--grid"
          style={{ aspectRatio: `${cols} / ${rows}` }}
          role="img"
          aria-label="Rejilla de búsqueda de rutas: haz clic para poner o quitar muros; arrastra el círculo rosa (inicio) o el anillo (meta)"
          data-cursor="DRAW"
          onPointerDown={onPointerDown}
          onPointerMove={(e) => drag.current && e.buttons && apply(cellAt(e))}
          onPointerUp={() => (drag.current = null)}
          onPointerLeave={() => (drag.current = null)}
        />

        <div className="lab__side">
          <div className="lab__segmented" role="group" aria-label="Algoritmo">
            {(Object.keys(ALGORITHMS) as Algorithm[]).map((key) => (
              <button
                key={key}
                aria-pressed={algorithm === key}
                onClick={() => setAlgorithm(key)}
                style={{ '--algo': `rgb(${ALGORITHMS[key].color})` } as React.CSSProperties}
                data-cursor="SELECT"
              >
                <span className="lab__swatch" aria-hidden="true" />
                {ALGORITHMS[key].label}
              </button>
            ))}
          </div>
          <p className="lab__note">{ALGORITHMS[algorithm].note}</p>

          <div className="lab__actions">
            <button className="lab__btn lab__btn--primary" onClick={run} data-cursor="RUN">
              ▶ Ejecutar
            </button>
            <button className="lab__btn" onClick={() => edit(randomWalls(world.current))} data-cursor="RANDOM">
              Muros aleatorios
            </button>
            <button className="lab__btn" onClick={() => edit(createWorld(cols, rows))} data-cursor="RESET">
              Reiniciar
            </button>
          </div>

          <dl className="lab__readout" aria-live="polite">
            {results.length === 0 && <p className="lab__hint">Ejecuta los dos algoritmos para comparar.</p>}
            {results.map((key) => {
              const s = stats[key] as Stats
              return (
                <div key={key} style={{ '--algo': `rgb(${ALGORITHMS[key].color})` } as React.CSSProperties}>
                  <dt>
                    <span className="lab__swatch" aria-hidden="true" />
                    {ALGORITHMS[key].label}
                  </dt>
                  <dd>
                    <strong>{s.explored}</strong> celdas exploradas ·{' '}
                    {s.length === null ? 'sin ruta' : (
                      <>
                        ruta de <strong>{s.length}</strong> pasos
                      </>
                    )}
                  </dd>
                </div>
              )
            })}
          </dl>
        </div>
      </div>
    </LabModule>
  )
}
