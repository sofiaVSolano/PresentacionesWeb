import { useCallback, useEffect, useRef, useState } from 'react'
import { useInView } from '@/hooks/useInView'
import { useSound } from '@/audio/soundContext'
import { playBlip } from '@/audio/soundEngine'
import { LabModule } from '../LabModule'
import { getContext, useCanvasSize } from '../useCanvas'
import { makeDataset, TinyMLP, type DatasetName, type LabeledPoint } from '../lib/mlp'

const DATASETS: Record<DatasetName, string> = { circles: 'Círculos', xor: 'XOR', spiral: 'Espiral' }
const COLORS = { 0: [158, 38, 55], 1: [243, 231, 220] } as const
const RES_X = 64
const RES_Y = 48

export function NeuralExperiment() {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const size = useCanvasSize(canvasRef)
  const visible = useInView(wrapRef, '100px')
  const { enabled: soundEnabled } = useSound()

  const [dataset, setDataset] = useState<DatasetName>('circles')
  const [brush, setBrush] = useState<0 | 1>(1)
  const [readout, setReadout] = useState({ epoch: 0, loss: 0, accuracy: 0 })
  const net = useRef(new TinyMLP([2, 8, 8, 1]))
  const points = useRef<LabeledPoint[]>(makeDataset('circles'))
  const epoch = useRef(0)
  const lossAvg = useRef(0.7)
  // mapa de decisión a baja resolución: se escala suavizado al dibujar
  const field = useRef<HTMLCanvasElement | null>(null)

  const load = (name: DatasetName) => {
    setDataset(name)
    points.current = makeDataset(name)
    net.current.reset()
    epoch.current = 0
    lossAvg.current = 0.7
  }

  const draw = useCallback(() => {
    const ctx = getContext(canvasRef.current, size)
    if (!ctx) return
    if (!field.current) {
      field.current = document.createElement('canvas')
      field.current.width = RES_X
      field.current.height = RES_Y
    }
    const fctx = field.current.getContext('2d')
    if (!fctx) return
    const image = fctx.createImageData(RES_X, RES_Y)
    for (let y = 0; y < RES_Y; y++) {
      for (let x = 0; x < RES_X; x++) {
        const p = net.current.predict((x / (RES_X - 1)) * 2 - 1, 1 - (y / (RES_Y - 1)) * 2)
        const k = (y * RES_X + x) * 4
        // mezcla granate ↔ crema según la probabilidad, con más opacidad cuanto más segura
        image.data[k] = COLORS[0][0] + (COLORS[1][0] - COLORS[0][0]) * p
        image.data[k + 1] = COLORS[0][1] + (COLORS[1][1] - COLORS[0][1]) * p
        image.data[k + 2] = COLORS[0][2] + (COLORS[1][2] - COLORS[0][2]) * p
        image.data[k + 3] = 40 + Math.abs(p - 0.5) * 2 * 110
      }
    }
    fctx.putImageData(image, 0, 0)

    ctx.clearRect(0, 0, size.w, size.h)
    ctx.imageSmoothingEnabled = true
    ctx.drawImage(field.current, 0, 0, size.w, size.h)

    for (const pt of points.current) {
      const x = ((pt.x + 1) / 2) * size.w
      const y = ((1 - pt.y) / 2) * size.h
      ctx.beginPath()
      ctx.arc(x, y, 4.2, 0, Math.PI * 2)
      ctx.fillStyle = pt.label ? '#f3e7dc' : '#9e2637'
      ctx.fill()
      ctx.lineWidth = 1.5
      ctx.strokeStyle = pt.label ? 'rgba(21, 19, 21, 0.9)' : 'rgba(243, 231, 220, 0.9)'
      ctx.stroke()
    }
  }, [size])

  // Entrena y dibuja en vivo, solo mientras el módulo está en pantalla
  useEffect(() => {
    if (!visible) return
    let raf = 0
    let frame = 0
    const tick = () => {
      const data = points.current
      if (data.length) {
        for (let k = 0; k < 60; k++) {
          const p = data[Math.floor(Math.random() * data.length)]
          const loss = net.current.train(p.x, p.y, p.label, 0.04)
          lossAvg.current = lossAvg.current * 0.995 + loss * 0.005
        }
        epoch.current += 60 / data.length
      }
      if (frame % 2 === 0) draw()
      if (frame % 15 === 0) {
        const correct = data.filter((p) => (net.current.predict(p.x, p.y) > 0.5 ? 1 : 0) === p.label).length
        setReadout({
          epoch: Math.floor(epoch.current),
          loss: lossAvg.current,
          accuracy: data.length ? correct / data.length : 0,
        })
      }
      frame++
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [visible, draw])

  const addPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    const y = 1 - ((event.clientY - rect.top) / rect.height) * 2
    points.current = [...points.current, { x, y, label: brush }]
    if (soundEnabled) playBlip()
  }

  return (
    <LabModule
      code="EXP-02"
      title="Red neuronal en vivo"
      running={visible}
      context={
        <>
          Una red neuronal real (2 → 8 → 8 → 1) entrenándose en tu navegador. <strong>Haz clic para añadir puntos</strong>{' '}
          y mira cómo aprende la frontera entre las dos clases.
        </>
      }
    >
      <div className="lab__body" ref={wrapRef}>
        <canvas
          ref={canvasRef}
          className="lab__canvas lab__canvas--square"
          role="img"
          aria-label="Clasificación de puntos por una red neuronal: haz clic para añadir un punto de la clase elegida"
          data-cursor="ADD"
          onPointerDown={addPoint}
        />

        <div className="lab__row">
          <div className="lab__segmented lab__segmented--small" role="group" aria-label="Conjunto de datos">
            {(Object.keys(DATASETS) as DatasetName[]).map((key) => (
              <button key={key} aria-pressed={dataset === key} onClick={() => load(key)} data-cursor="LOAD">
                {DATASETS[key]}
              </button>
            ))}
          </div>
          <div className="lab__segmented lab__segmented--small" role="group" aria-label="Clase del próximo punto">
            {([1, 0] as const).map((label) => (
              <button
                key={label}
                aria-pressed={brush === label}
                onClick={() => setBrush(label)}
                aria-label={`Clase ${label ? 'crema' : 'granate'}`}
                data-cursor="CLASS"
              >
                <span className={`lab__dot lab__dot--${label}`} aria-hidden="true" />
              </button>
            ))}
          </div>
          <button className="lab__btn" onClick={() => load(dataset)} data-cursor="RESET">
            Reiniciar
          </button>
        </div>

        <dl className="lab__metrics" aria-live="off">
          <div>
            <dt>Época</dt>
            <dd>{readout.epoch}</dd>
          </div>
          <div>
            <dt>Pérdida</dt>
            <dd>{readout.loss.toFixed(3)}</dd>
          </div>
          <div>
            <dt>Precisión</dt>
            <dd>{Math.round(readout.accuracy * 100)}%</dd>
          </div>
        </dl>
      </div>
    </LabModule>
  )
}
