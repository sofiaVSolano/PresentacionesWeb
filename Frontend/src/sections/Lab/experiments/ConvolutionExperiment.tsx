import { useCallback, useEffect, useRef, useState } from 'react'
import { useInView } from '@/hooks/useInView'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { useSound } from '@/audio/soundContext'
import { playBlip } from '@/audio/soundEngine'
import { LabModule } from '../LabModule'
import {
  convolve,
  isSigned,
  kernelSum,
  KERNEL_PRESETS,
  paintFeatureMap,
  toGray,
  windowAt,
  type Kernel,
} from '../lib/convolution'

// Resolución de trabajo: suficiente para ver los rasgos y barata de calcular en cada frame
const W = 200
const H = 150

type Source = 'avatar' | 'photo' | 'camera'

const SOURCES: { id: Source; label: string; src?: string }[] = [
  { id: 'avatar', label: 'Avatar', src: '/assets/character/sofia-avatar-cutout.png' },
  { id: 'photo', label: 'Foto', src: '/assets/character/sofia-real-cutout.png' },
  { id: 'camera', label: 'Cámara' },
]

interface Probe {
  x: number
  y: number
  values: number[]
  result: number
}

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1))

export function ConvolutionExperiment() {
  const wrapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLCanvasElement>(null)
  const outputRef = useRef<HTMLCanvasElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const gray = useRef<Float32Array>(new Float32Array(W * H))
  const pixels = useRef<ImageData | null>(null)
  const visible = useInView(wrapRef, '100px')
  const prefersReducedMotion = usePrefersReducedMotion()
  const { enabled: soundEnabled } = useSound()

  const [source, setSource] = useState<Source>('avatar')
  const [preset, setPreset] = useState<string | null>('edges')
  const [kernel, setKernel] = useState<Kernel>(KERNEL_PRESETS[0].weights)
  const [probe, setProbe] = useState<Probe | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [scanRow, setScanRow] = useState(H)

  /** Dibuja la entrada, la convierte a grises y pinta la salida hasta `rows` filas */
  const render = useCallback(
    (rows: number, windowRow: number | null) => {
      const input = inputRef.current
      const output = outputRef.current
      const ictx = input?.getContext('2d', { willReadFrequently: true })
      const octx = output?.getContext('2d')
      if (!input || !output || !ictx || !octx || !pixels.current) return

      ictx.putImageData(pixels.current, 0, 0)
      const result = convolve(gray.current, W, H, kernel)
      const image = octx.createImageData(W, H)
      paintFeatureMap(result, image, isSigned(kernel), rows)
      octx.clearRect(0, 0, W, H)
      octx.putImageData(image, 0, 0)

      // ventana 3×3 (ampliada para que se vea) recorriendo la entrada durante el barrido
      if (windowRow !== null) {
        ictx.strokeStyle = '#e04a5f'
        ictx.lineWidth = 1.5
        ictx.strokeRect(0.75, windowRow - 5, W - 1.5, 10)
      }
    },
    [kernel]
  )

  /** Carga la fuente (imagen) en el buffer de grises */
  const loadImage = useCallback((src: string) => {
    return new Promise<void>((resolve) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = W
        canvas.height = H
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        if (!ctx) return resolve()
        ctx.fillStyle = '#151315'
        ctx.fillRect(0, 0, W, H)
        const scale = Math.min(W / img.naturalWidth, H / img.naturalHeight) * 1.35
        const dw = img.naturalWidth * scale
        const dh = img.naturalHeight * scale
        // encuadre en la cara: la parte superior de la figura
        ctx.drawImage(img, (W - dw) / 2, -dh * 0.02, dw, dh)
        pixels.current = ctx.getImageData(0, 0, W, H)
        gray.current = toGray(pixels.current.data, W, H)
        resolve()
      }
      img.onerror = () => resolve()
      img.src = src
    })
  }, [])

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }

  // Cambio de fuente
  useEffect(() => {
    if (source === 'camera') return
    stopCamera()
    const item = SOURCES.find((s) => s.id === source)
    if (item?.src) void loadImage(item.src).then(() => setScanRow(prefersReducedMotion ? H : 0))
  }, [source, loadImage, prefersReducedMotion])

  // Cámara: se enciende solo con el botón y se apaga al salir de pantalla o al desmontar
  useEffect(() => {
    if (source !== 'camera' || !visible) {
      if (source === 'camera') stopCamera()
      return
    }
    let raf = 0
    let cancelled = false
    const scratch = document.createElement('canvas')
    scratch.width = W
    scratch.height = H
    const sctx = scratch.getContext('2d', { willReadFrequently: true })

    navigator.mediaDevices
      ?.getUserMedia({ video: { width: 320, height: 240, facingMode: 'user' }, audio: false })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        const video = videoRef.current
        if (!video) return
        video.srcObject = stream
        void video.play()
        setCameraError(null)
        const tick = () => {
          if (sctx && video.readyState >= 2) {
            // efecto espejo: más natural al verse en cámara
            sctx.save()
            sctx.translate(W, 0)
            sctx.scale(-1, 1)
            const scale = Math.max(W / video.videoWidth, H / video.videoHeight)
            const dw = video.videoWidth * scale
            const dh = video.videoHeight * scale
            sctx.drawImage(video, (W - dw) / 2, (H - dh) / 2, dw, dh)
            sctx.restore()
            pixels.current = sctx.getImageData(0, 0, W, H)
            gray.current = toGray(pixels.current.data, W, H)
            render(H, null)
          }
          raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
      })
      .catch(() => {
        setCameraError('No se pudo acceder a la cámara. Puedes seguir con el avatar o la foto.')
        setSource('avatar')
      })

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      stopCamera()
    }
  }, [source, visible, render])

  useEffect(() => stopCamera, [])

  // Barrido: la salida se construye fila a fila mientras la ventana recorre la entrada
  useEffect(() => {
    if (source === 'camera' || !visible) return
    if (scanRow >= H) {
      render(H, null)
      return
    }
    const raf = requestAnimationFrame(() => {
      render(scanRow, scanRow)
      setScanRow((r) => Math.min(H, r + 3))
    })
    return () => cancelAnimationFrame(raf)
  }, [scanRow, source, visible, render])

  const choosePreset = (id: string) => {
    const p = KERNEL_PRESETS.find((k) => k.id === id)
    if (!p) return
    setPreset(id)
    setKernel(p.weights)
    setScanRow(prefersReducedMotion || source === 'camera' ? H : 0)
    if (soundEnabled) playBlip()
  }

  const editWeight = (i: number, value: string) => {
    const n = Number(value)
    if (Number.isNaN(n)) return
    setKernel((k) => k.map((w, j) => (j === i ? n : w)))
    setPreset(null)
    setScanRow(H)
  }

  const onProbe = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = Math.floor(((event.clientX - rect.left) / rect.width) * W)
    const y = Math.floor(((event.clientY - rect.top) / rect.height) * H)
    if (x < 0 || y < 0 || x >= W || y >= H) return
    const values = windowAt(gray.current, W, H, x, y)
    const div = isSigned(kernel) ? 1 : kernelSum(kernel)
    const result = values.reduce((acc, v, k) => acc + v * kernel[k], 0) / div
    setProbe({ x, y, values, result })
  }

  const signed = isSigned(kernel)
  const sum = kernelSum(kernel)

  return (
    <LabModule
      code="EXP-03"
      title="Cómo ve una máquina"
      running={visible}
      context={
        <>
          La visión por computador —el área de <strong>EndanSys</strong>, mi herramienta de IA para identificar especies en
          peligro (ColCACI 2025)— se construye sobre esta operación: la <strong>convolución</strong>. Elige un filtro,
          edita sus pesos y pasa el cursor por la salida.
        </>
      }
    >
      <div className="lab__body" ref={wrapRef}>
        <div className="lab__segmented lab__segmented--small" role="group" aria-label="Imagen de entrada">
          {SOURCES.map((s) => (
            <button
              key={s.id}
              aria-pressed={source === s.id}
              onClick={() => {
                if (s.id === 'camera' && !navigator.mediaDevices?.getUserMedia) {
                  setCameraError('Este navegador no permite usar la cámara aquí.')
                  return
                }
                setCameraError(null)
                setSource(s.id)
              }}
              data-cursor={s.id === 'camera' ? 'CAMERA' : 'LOAD'}
            >
              {s.label}
            </button>
          ))}
        </div>
        {source === 'camera' && <p className="lab__hint">La imagen de tu cámara se procesa en tu navegador y no se envía a ningún lado.</p>}
        {cameraError && <p className="lab__hint lab__hint--warn">{cameraError}</p>}

        <div className="lab__conv">
          <figure>
            <figcaption>Entrada</figcaption>
            <canvas ref={inputRef} width={W} height={H} className="lab__canvas lab__canvas--conv" aria-label="Imagen de entrada" />
          </figure>
          <figure>
            <figcaption>Mapa de características</figcaption>
            <canvas
              ref={outputRef}
              width={W}
              height={H}
              className="lab__canvas lab__canvas--conv"
              aria-label="Resultado de aplicar el filtro: pasa el cursor para ver el cálculo de cada píxel"
              data-cursor="INSPECT"
              onPointerMove={onProbe}
              onPointerLeave={() => setProbe(null)}
            />
          </figure>
        </div>

        <div className="lab__segmented lab__segmented--wrap" role="group" aria-label="Filtro">
          {KERNEL_PRESETS.map((p) => (
            <button key={p.id} aria-pressed={preset === p.id} onClick={() => choosePreset(p.id)} data-cursor="FILTER">
              {p.label}
            </button>
          ))}
        </div>

        <div className="lab__kernel-row">
          <div className="lab__kernel" role="group" aria-label="Pesos del filtro 3×3">
            {kernel.map((w, i) => (
              <input
                key={i}
                type="number"
                step={0.5}
                value={w}
                aria-label={`Peso fila ${Math.floor(i / 3) + 1}, columna ${(i % 3) + 1}`}
                onChange={(e) => editWeight(i, e.target.value)}
                data-weight={w > 0 ? 'pos' : w < 0 ? 'neg' : 'zero'}
              />
            ))}
          </div>

          <div className="lab__probe" aria-live="polite">
            {probe ? (
              <>
                <p className="lab__probe-title">
                  Píxel ({probe.x}, {probe.y})
                </p>
                <div className="lab__probe-grid">
                  {probe.values.map((v, i) => (
                    <span key={i}>
                      {Math.round(v)}
                      <small>×{fmt(kernel[i])}</small>
                    </span>
                  ))}
                </div>
                <p className="lab__probe-result">
                  Σ{!signed && sum !== 1 ? ` ÷ ${fmt(sum)}` : ''} = <strong>{probe.result.toFixed(0)}</strong>
                </p>
              </>
            ) : (
              <p className="lab__hint">
                Cada píxel de la salida = los 9 píxeles bajo la ventana × estos pesos, sumados.{' '}
                {signed ? 'Estos pesos suman 0: el filtro detecta cambios (granate = negativo, crema = positivo).' : ''}
              </p>
            )}
          </div>
        </div>

        <video ref={videoRef} className="lab__video" playsInline muted aria-hidden="true" />
      </div>
    </LabModule>
  )
}
