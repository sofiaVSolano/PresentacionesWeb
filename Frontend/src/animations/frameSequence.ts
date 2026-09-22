import { videoFrames, type VideoName } from '@/data/videoFrames'

interface FrameSequenceOptions {
  canvas: HTMLCanvasElement
  urls: string[]
  /** Descargas simultáneas; bajo para no competir con el resto de la página */
  concurrency?: number
  /**
   * Pantallas verticales: 'band' muestra el video completo sobre un fondo desenfocado;
   * 'cover' recorta llenando la pantalla, centrado en `focusX`.
   */
  portrait?: 'band' | 'cover'
  /** Centro horizontal del recorte "cover" (0 = izquierda, 1 = derecha) */
  focusX?: number
}

/** URLs de los fotogramas de un video, eligiendo la resolución según la pantalla */
export function frameUrls(name: VideoName) {
  const { count, basePath } = videoFrames[name]
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  // 'sm' solo en pantallas realmente pequeñas: reescalar hacia arriba es lo que se ve borroso
  const set = window.innerWidth * dpr > 900 ? 'lg' : 'sm'
  return Array.from(
    { length: count },
    (_, i) => `${basePath}/${set}/frame-${String(i + 1).padStart(3, '0')}.webp`
  )
}

/**
 * Reproduce una secuencia de fotogramas en un canvas según un progreso 0 → 1.
 * Carga de forma progresiva (primero, último, luego cada 32, 16, 8…) y, si el
 * fotograma pedido aún no llegó, dibuja el cargado más cercano: nunca queda en blanco.
 */
export class FrameSequence {
  private readonly canvas: HTMLCanvasElement
  private readonly ctx: CanvasRenderingContext2D | null
  private readonly urls: string[]
  private readonly concurrency: number
  private readonly portrait: 'band' | 'cover'
  private focusX: number
  private readonly images: (HTMLImageElement | null)[]
  private target = 0
  private drawn = -1
  private destroyed = false
  private started = false
  /** Lienzo diminuto para el fondo desenfocado en pantallas verticales */
  private readonly blurCanvas = document.createElement('canvas')
  /** Lienzo auxiliar para difuminar los bordes de la banda de video */
  private readonly bandCanvas = document.createElement('canvas')

  constructor({
    canvas,
    urls,
    concurrency = 4,
    portrait = 'band',
    focusX = 0.5,
  }: FrameSequenceOptions) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.urls = urls
    this.concurrency = concurrency
    this.portrait = portrait
    this.focusX = focusX
    this.images = urls.map(() => null)
  }

  /** Cambia el centro del recorte (p. ej. para seguir a la persona durante el video) */
  setFocusX(focusX: number) {
    if (Math.abs(focusX - this.focusX) < 0.001) return
    this.focusX = focusX
    this.drawn = -1
    this.render()
  }

  get count() {
    return this.urls.length
  }

  /** Carga solo el primer fotograma — lo mínimo para que la sección no se vea vacía */
  async loadFirst() {
    await this.loadOne(0)
  }

  /** Carga el resto en orden de "refinamiento progresivo" */
  loadAll() {
    if (this.started) return
    this.started = true
    const order = this.loadOrder()
    let cursor = 0
    const next = async (): Promise<void> => {
      while (cursor < order.length && !this.destroyed) {
        const index = order[cursor++]
        if (!this.images[index]) await this.loadOne(index)
      }
    }
    for (let k = 0; k < this.concurrency; k++) void next()
  }

  setProgress(progress: number) {
    const clamped = Math.min(1, Math.max(0, progress))
    this.target = Math.round(clamped * (this.count - 1))
    this.render()
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const w = this.canvas.clientWidth
    const h = this.canvas.clientHeight
    this.canvas.width = Math.round(w * dpr)
    this.canvas.height = Math.round(h * dpr)
    this.drawn = -1
    this.render()
  }

  destroy() {
    this.destroyed = true
  }

  private loadOrder(): number[] {
    const order: number[] = []
    const seen = new Set<number>()
    const push = (i: number) => {
      if (i >= 0 && i < this.count && !seen.has(i)) {
        seen.add(i)
        order.push(i)
      }
    }
    push(0)
    push(this.count - 1)
    for (let step = 32; step >= 1; step /= 2) {
      for (let i = 0; i < this.count; i += step) push(i)
    }
    return order
  }

  private async loadOne(index: number) {
    const img = new Image()
    img.decoding = 'async'
    img.src = this.urls[index]
    try {
      await img.decode()
    } catch {
      return // un fotograma caído no rompe la secuencia: se usa el vecino
    }
    if (this.destroyed) return
    this.images[index] = img
    // si este fotograma queda más cerca del pedido que el que se ve ahora, redibujar
    if (this.drawn === -1 || Math.abs(index - this.target) < Math.abs(this.drawn - this.target)) {
      this.render()
    }
  }

  private nearestLoaded(index: number): number {
    if (this.images[index]) return index
    for (let d = 1; d < this.count; d++) {
      if (this.images[index - d]) return index - d
      if (this.images[index + d]) return index + d
    }
    return -1
  }

  private render() {
    const ctx = this.ctx
    if (!ctx || this.canvas.width === 0) return
    const index = this.nearestLoaded(this.target)
    if (index === -1 || index === this.drawn) return
    const img = this.images[index]
    if (!img) return

    const cw = this.canvas.width
    const ch = this.canvas.height
    const iw = img.naturalWidth
    const ih = img.naturalHeight
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'

    if (this.portrait === 'band' && cw / ch < (iw / ih) * 0.75) {
      // Pantalla vertical: "cover" recortaría casi todo el video horizontal.
      // Fondo = el mismo fotograma desenfocado y teñido; encima, el video nítido en una banda.
      this.drawBlurredBackdrop(ctx, img, cw, ch)
      const scale = (cw * 1.3) / iw
      const dw = Math.round(iw * scale)
      const dh = Math.round(ih * scale)
      this.drawFeatheredBand(ctx, img, (cw - dw) / 2, (ch - dh) / 2 - ch * 0.04, dw, dh)
    } else {
      // Ajuste "cover": llena el canvas sin deformar, centrado en focusX
      const scale = Math.max(cw / iw, ch / ih)
      const dw = iw * scale
      const dh = ih * scale
      const x = Math.min(0, Math.max(cw - dw, cw / 2 - dw * this.focusX))
      ctx.drawImage(img, x, (ch - dh) / 2, dw, dh)
    }
    this.drawn = index
  }

  /** Dibuja el video con los bordes superior e inferior desvanecidos sobre el fondo */
  private drawFeatheredBand(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    x: number,
    y: number,
    w: number,
    h: number
  ) {
    const band = this.bandCanvas
    band.width = w
    band.height = h
    const bctx = band.getContext('2d')
    if (!bctx) {
      ctx.drawImage(img, x, y, w, h)
      return
    }
    bctx.drawImage(img, 0, 0, w, h)
    const fade = bctx.createLinearGradient(0, 0, 0, h)
    fade.addColorStop(0, 'rgba(0, 0, 0, 0)')
    fade.addColorStop(0.12, 'rgba(0, 0, 0, 1)')
    fade.addColorStop(0.88, 'rgba(0, 0, 0, 1)')
    fade.addColorStop(1, 'rgba(0, 0, 0, 0)')
    bctx.globalCompositeOperation = 'destination-in'
    bctx.fillStyle = fade
    bctx.fillRect(0, 0, w, h)
    bctx.globalCompositeOperation = 'source-over'
    ctx.drawImage(band, x, y)
  }

  /** Desenfoque sin `ctx.filter` (Safari no lo soporta bien): reducir a unos píxeles y reampliar */
  private drawBlurredBackdrop(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    cw: number,
    ch: number
  ) {
    const small = this.blurCanvas
    small.width = 36
    small.height = Math.max(1, Math.round((36 * ch) / cw))
    const sctx = small.getContext('2d')
    if (!sctx) return
    const scale = Math.max(small.width / img.naturalWidth, small.height / img.naturalHeight)
    const dw = img.naturalWidth * scale
    const dh = img.naturalHeight * scale
    sctx.drawImage(img, (small.width - dw) / 2, (small.height - dh) / 2, dw, dh)

    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(small, 0, 0, cw, ch)
    ctx.fillStyle = 'rgba(33, 3, 8, 0.38)'
    ctx.fillRect(0, 0, cw, ch)
  }
}
