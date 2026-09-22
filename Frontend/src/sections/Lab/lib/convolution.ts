export type Kernel = number[] // 9 pesos, fila por fila

export interface KernelPreset {
  id: string
  label: string
  weights: Kernel
}

export const KERNEL_PRESETS: KernelPreset[] = [
  { id: 'edges', label: 'Bordes', weights: [0, 1, 0, 1, -4, 1, 0, 1, 0] },
  { id: 'sobel-x', label: 'Bordes verticales', weights: [-1, 0, 1, -2, 0, 2, -1, 0, 1] },
  { id: 'sobel-y', label: 'Bordes horizontales', weights: [-1, -2, -1, 0, 0, 0, 1, 2, 1] },
  { id: 'emboss', label: 'Relieve', weights: [-2, -1, 0, -1, 1, 1, 0, 1, 2] },
  { id: 'sharpen', label: 'Enfoque', weights: [0, -1, 0, -1, 5, -1, 0, -1, 0] },
  { id: 'blur', label: 'Desenfoque', weights: [1, 1, 1, 1, 1, 1, 1, 1, 1] },
]

export const kernelSum = (k: Kernel) => k.reduce((a, b) => a + b, 0)

/**
 * Si los pesos suman 0 el filtro detecta cambios (bordes): la salida tiene signo.
 * Si no, se normaliza dividiendo por la suma y la salida es una imagen (0–255).
 */
export const isSigned = (k: Kernel) => Math.abs(kernelSum(k)) < 1e-6

/** Convierte RGBA a luminancia (0–255) */
export function toGray(rgba: Uint8ClampedArray, w: number, h: number): Float32Array {
  const gray = new Float32Array(w * h)
  for (let i = 0; i < w * h; i++) {
    gray[i] = 0.299 * rgba[i * 4] + 0.587 * rgba[i * 4 + 1] + 0.114 * rgba[i * 4 + 2]
  }
  return gray
}

/** Convolución 3×3 (bordes replicados). Devuelve el valor crudo de cada píxel. */
export function convolve(gray: Float32Array, w: number, h: number, kernel: Kernel): Float32Array {
  const out = new Float32Array(w * h)
  const div = isSigned(kernel) ? 1 : kernelSum(kernel)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let acc = 0
      for (let ky = -1; ky <= 1; ky++) {
        const yy = Math.min(h - 1, Math.max(0, y + ky))
        for (let kx = -1; kx <= 1; kx++) {
          const xx = Math.min(w - 1, Math.max(0, x + kx))
          acc += gray[yy * w + xx] * kernel[(ky + 1) * 3 + (kx + 1)]
        }
      }
      out[y * w + x] = acc / div
    }
  }
  return out
}

/** Los 9 valores bajo la ventana centrada en (x, y) */
export function windowAt(gray: Float32Array, w: number, h: number, x: number, y: number): number[] {
  const values: number[] = []
  for (let ky = -1; ky <= 1; ky++) {
    const yy = Math.min(h - 1, Math.max(0, y + ky))
    for (let kx = -1; kx <= 1; kx++) {
      const xx = Math.min(w - 1, Math.max(0, x + kx))
      values.push(gray[yy * w + xx])
    }
  }
  return values
}

/**
 * Pinta el mapa de características. Con signo: negativo → granate, positivo → crema.
 * Sin signo: escala de grises teñida de crema. Solo se pintan las filas < `rows` (animación de barrido).
 */
export function paintFeatureMap(out: Float32Array, image: ImageData, signed: boolean, rows: number) {
  const { width: w, height: h, data } = image
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      const p = i * 4
      if (y >= rows) {
        data[p + 3] = 0
        continue
      }
      const v = out[i]
      if (signed) {
        const t = Math.max(-1, Math.min(1, v / 90))
        if (t >= 0) {
          data[p] = 243 * t
          data[p + 1] = 231 * t
          data[p + 2] = 220 * t
        } else {
          data[p] = 190 * -t
          data[p + 1] = 38 * -t
          data[p + 2] = 60 * -t
        }
      } else {
        const g = Math.max(0, Math.min(255, v)) / 255
        data[p] = 243 * g
        data[p + 1] = 231 * g
        data[p + 2] = 220 * g
      }
      data[p + 3] = 255
    }
  }
}
