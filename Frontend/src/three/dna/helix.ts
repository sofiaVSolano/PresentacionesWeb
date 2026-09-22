import { CatmullRomCurve3, Quaternion, Vector3 } from 'three'

export const HELIX = {
  radius: 1.5,
  /** separación vertical entre peldaños */
  rise: 0.62,
  /** giro (rad) entre peldaños consecutivos */
  twist: 0.52,
}

export interface HelixBead {
  position: Vector3
  /** posición dispersa desde la que "vuela" al ensamblarse */
  scatter: Vector3
  angle: number
}

export interface HelixRung {
  position: Vector3
  quaternion: Quaternion
  length: number
}

/** Pseudoaleatorio determinista: misma dispersión en cada render */
const seeded = (i: number, k: number) => {
  const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453
  return x - Math.floor(x)
}

/**
 * Doble hélice con el eje en Y. Las bases se reparten por pares (una por hebra),
 * así cada peldaño une dos tecnologías.
 */
export function buildHelix(count: number) {
  const { radius, rise, twist } = HELIX
  const rungCount = Math.ceil(count / 2)
  const half = (rungCount - 1) / 2

  const beads: HelixBead[] = Array.from({ length: count }, (_, i) => {
    const rung = Math.floor(i / 2)
    const angle = rung * twist + (i % 2) * Math.PI
    return {
      angle,
      position: new Vector3(Math.cos(angle) * radius, (rung - half) * rise, Math.sin(angle) * radius),
      scatter: new Vector3(
        (seeded(i, 1) - 0.5) * 18,
        (seeded(i, 2) - 0.5) * 10,
        (seeded(i, 3) - 0.5) * 8
      ),
    }
  })

  const rungs: HelixRung[] = []
  for (let r = 0; r < rungCount; r++) {
    const a = beads[2 * r]
    const b = beads[2 * r + 1]
    if (!b) continue
    const dir = b.position.clone().sub(a.position)
    const length = dir.length()
    rungs.push({
      position: a.position.clone().add(b.position).multiplyScalar(0.5),
      quaternion: new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), dir.normalize()),
      length,
    })
  }

  const backbones = [0, 1].map((strand) => {
    const points: Vector3[] = []
    const steps = rungCount * 8
    for (let k = 0; k <= steps; k++) {
      const t = (k / steps) * (rungCount - 1)
      const angle = t * twist + strand * Math.PI
      points.push(new Vector3(Math.cos(angle) * radius, (t - half) * rise, Math.sin(angle) * radius))
    }
    return new CatmullRomCurve3(points)
  })

  return { beads, rungs, backbones, length: (rungCount - 1) * rise }
}
