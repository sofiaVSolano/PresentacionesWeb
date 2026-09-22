import { CanvasTexture, SRGBColorSpace } from 'three'

/** PRNG determinista: cada planeta tiene siempre la misma superficie */
function mulberry32(seed: number) {
  let s = seed
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hexToRgb(hex: string) {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/**
 * Textura procedural de planeta: bandas horizontales onduladas (estilo gigante gaseoso)
 * mezclando dos colores, más algunas manchas. Se genera en un canvas: sin descargas.
 */
export function createPlanetTexture(base: string, accent: string, seed: number) {
  const width = 512
  const height = 256
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return new CanvasTexture(canvas)

  const rand = mulberry32(seed * 9973 + 17)
  const [br, bg, bb] = hexToRgb(base)
  const [ar, ag, ab] = hexToRgb(accent)
  const freqA = 4 + rand() * 7
  const freqB = 11 + rand() * 14
  const warp = 0.6 + rand() * 1.4
  const phase = rand() * 10

  const image = ctx.createImageData(width, height)
  for (let y = 0; y < height; y++) {
    const v = y / height
    for (let x = 0; x < width; x++) {
      const u = x / width
      // el ruido depende de sin/cos de u para que la textura se cierre sin costura
      const wave = Math.sin(u * Math.PI * 2 * 3 + phase) * 0.03 * warp + Math.cos(u * Math.PI * 2 * 5) * 0.015
      const bands =
        Math.sin((v + wave) * Math.PI * freqA) * 0.6 + Math.sin((v - wave * 1.7) * Math.PI * freqB) * 0.4
      const t = Math.min(1, Math.max(0, 0.5 + bands * 0.5))
      const shade = 0.82 + 0.18 * Math.sin(v * Math.PI) // polos algo más oscuros
      const i = (y * width + x) * 4
      image.data[i] = (br + (ar - br) * t) * shade
      image.data[i + 1] = (bg + (ag - bg) * t) * shade
      image.data[i + 2] = (bb + (ab - bb) * t) * shade
      image.data[i + 3] = 255
    }
  }
  ctx.putImageData(image, 0, 0)

  // manchas / tormentas
  const spots = 2 + Math.floor(rand() * 3)
  for (let k = 0; k < spots; k++) {
    const x = rand() * width
    const y = height * (0.25 + rand() * 0.5)
    const r = 10 + rand() * 26
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r)
    grad.addColorStop(0, `rgba(${ar}, ${ag}, ${ab}, 0.55)`)
    grad.addColorStop(1, `rgba(${ar}, ${ag}, ${ab}, 0)`)
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.ellipse(x, y, r * 1.8, r * 0.7, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 4
  return texture
}
