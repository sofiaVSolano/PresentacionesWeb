import { Vector3 } from 'three'

/**
 * Cerebro procedural dibujado con líneas. Ejes: x = izquierda/derecha, y = arriba,
 * z = delante (+) / detrás (-). Proporciones de un cerebro real visto desde arriba:
 * ancho ≈ 0,85 × largo, con los dos hemisferios pegados por su cara interna (la cisura
 * longitudinal) y la frente más estrecha.
 */
const RX = 0.62 // semiancho de cada hemisferio (cara externa)
const RY = 0.54 // altura
const RZ = 0.95 // semilargo (frente-nuca)
const MEDIAL = 0.16 // la cara interna se aplana a este factor: forma de "D"
const FISSURE = 0.022 // media anchura de la cisura entre hemisferios
const CEREBELLUM_CENTER = new Vector3(0, -0.34, -0.74)
const CEREBELLUM_RADII = new Vector3(0.58, 0.22, 0.28)
/** El casco queda un poco por dentro de las líneas: tapa las de detrás sin cortar las de delante */
const HULL_INSET = 0.975

/** Tipo de trazo: define su brillo en el shader */
export const LINE_KIND = { sulcus: 0, major: 1, cerebellum: 2 } as const

/**
 * Circunvoluciones: función suave sobre la esfera cuyas curvas de nivel cero serpentean
 * como los surcos. Los términos en z dominan: los surcos corren sobre todo de lado a lado,
 * como en la corteza real vista desde arriba.
 */
function foldField(d: Vector3) {
  return (
    Math.sin(d.z * 23 + Math.sin(d.x * 9 + d.y * 4) * 2.8) +
    Math.sin(d.x * 17 + Math.sin(d.z * 8) * 2.6) * 0.7 +
    Math.sin(d.y * 19 + Math.sin(d.z * 7 + d.x * 5) * 2.4) * 0.55
  )
}

/** Surco central (Rolando): cruza cada hemisferio desde la cisura hacia el costado */
const centralSulcus = (d: Vector3) => d.z + 0.08 - Math.abs(d.x) * 0.28 + Math.sin(d.x * 9) * 0.03

/** Cisura lateral (Silvio): separa el lóbulo temporal, baja en diagonal por el costado */
const lateralFissure = (d: Vector3) => d.y + 0.05 - d.z * 0.45 + Math.sin(d.z * 5) * 0.04

interface SurfacePoint {
  position: Vector3
  normal: Vector3
}

/** Punto (y normal) de la superficie de un hemisferio (side = -1 izquierdo, +1 derecho) */
function hemisphereSurface(d: Vector3, side: number, inset = 1): SurfacePoint {
  const medial = d.x * side < 0
  const rx = RX * (medial ? MEDIAL : 1) * (1 - Math.max(0, d.z) * 0.2) // frente más estrecha
  const ry = RY * (d.y < 0 ? 0.62 : 1) // base aplanada
  const rz = RZ * (d.z < 0 ? 1.04 : 1) // nuca algo más larga

  const position = new Vector3(d.x * rx, d.y * ry, d.z * rz).multiplyScalar(inset)
  // normal de un elipsoide: gradiente (x/rx², y/ry², z/rz²)
  const normal = new Vector3(
    position.x / (rx * rx),
    position.y / (ry * ry),
    position.z / (rz * rz)
  ).normalize()
  // El borde superior interno (d.x = 0) queda junto a la cisura; la cara interna, que no se
  // ve desde arriba, se hunde bajo el otro hemisferio sin que se note.
  position.x += side * (FISSURE + RX * MEDIAL * 0.15)
  return { position, normal }
}

function cerebellumSurface(d: Vector3, inset = 1): SurfacePoint {
  const r = CEREBELLUM_RADII
  const position = new Vector3(d.x * r.x, d.y * r.y, d.z * r.z).multiplyScalar(inset)
  const normal = new Vector3(d.x / r.x, d.y / r.y, d.z / r.z).normalize()
  position.add(CEREBELLUM_CENTER)
  return { position, normal }
}

/** Dirección unitaria desde coordenadas esféricas: u = longitud [0, 2π), v = colatitud [0, π] */
function sphereDir(u: number, v: number, target = new Vector3()) {
  const s = Math.sin(v)
  return target.set(s * Math.cos(u), Math.cos(v), s * Math.sin(u))
}

/**
 * Curvas de nivel cero de `field` sobre la esfera (marching squares en la malla u/v).
 * Devuelve pares de direcciones: cada par es un segmento de la curva.
 */
function contour(
  field: (d: Vector3) => number,
  keep: (d: Vector3) => boolean,
  resU: number,
  resV: number
): Vector3[] {
  const values = new Float32Array((resU + 1) * (resV + 1))
  const dir = new Vector3()
  for (let j = 0; j <= resV; j++) {
    for (let i = 0; i <= resU; i++) {
      values[j * (resU + 1) + i] = field(sphereDir((i / resU) * Math.PI * 2, (j / resV) * Math.PI, dir))
    }
  }

  const out: Vector3[] = []
  const edgePoint = (i0: number, j0: number, i1: number, j1: number) => {
    const a = values[j0 * (resU + 1) + i0]
    const b = values[j1 * (resU + 1) + i1]
    const t = a / (a - b)
    const u = ((i0 + (i1 - i0) * t) / resU) * Math.PI * 2
    const v = ((j0 + (j1 - j0) * t) / resV) * Math.PI
    return sphereDir(u, v)
  }

  for (let j = 0; j < resV; j++) {
    for (let i = 0; i < resU; i++) {
      // esquinas: 0 (i,j) · 1 (i+1,j) · 2 (i+1,j+1) · 3 (i,j+1)
      const c = [
        values[j * (resU + 1) + i],
        values[j * (resU + 1) + i + 1],
        values[(j + 1) * (resU + 1) + i + 1],
        values[(j + 1) * (resU + 1) + i],
      ]
      const corners: [number, number][] = [
        [i, j],
        [i + 1, j],
        [i + 1, j + 1],
        [i, j + 1],
      ]
      const crossings: Vector3[] = []
      for (let e = 0; e < 4; e++) {
        const a = c[e]
        const b = c[(e + 1) % 4]
        if (a < 0 !== b < 0) {
          const [i0, j0] = corners[e]
          const [i1, j1] = corners[(e + 1) % 4]
          crossings.push(edgePoint(i0, j0, i1, j1))
        }
      }
      // 2 cruces = un segmento; 4 cruces (celda ambigua) = dos segmentos
      for (let k = 0; k + 1 < crossings.length; k += 2) {
        const [a, b] = [crossings[k], crossings[k + 1]]
        const mid = a.clone().add(b).normalize()
        if (keep(mid)) out.push(a, b)
      }
    }
  }
  return out
}

/**
 * Direcciones para las regiones: en la cara externa y superior, visibles desde la cámara
 * (el grupo se inclina `view` rad sobre X), repartidas lo más separadas posible.
 */
function regionDirections(count: number, side: number, view: number): Vector3[] {
  const candidates: Vector3[] = []
  const n = 500
  const golden = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2
    const r = Math.sqrt(1 - y * y)
    const d = new Vector3(Math.cos(golden * i) * r, y, Math.sin(golden * i) * r)
    const { normal } = hemisphereSurface(d, side)
    const facing = normal.y * Math.sin(view) + normal.z * Math.cos(view)
    if (d.x * side > 0.12 && facing > 0.35) candidates.push(d)
  }

  const chosen: Vector3[] = [candidates.reduce((a, b) => (b.y > a.y ? b : a))]
  while (chosen.length < count && chosen.length < candidates.length) {
    let best = candidates[0]
    let bestDist = -1
    for (const c of candidates) {
      const dist = Math.min(...chosen.map((k) => c.distanceTo(k)))
      if (dist > bestDist) {
        bestDist = dist
        best = c
      }
    }
    chosen.push(best)
  }

  // Orden por altura en pantalla: la idea 01 de cada lista queda en la región más alta,
  // así los cables de luz no se cruzan.
  const screenY = (d: Vector3) => {
    const p = hemisphereSurface(d, side).position
    return p.y * Math.cos(view) - p.z * Math.sin(view)
  }
  return chosen.sort((a, b) => screenY(b) - screenY(a))
}

/** Región (índice global) del punto `p` (espacio local) o -1 si cae en el cerebelo */
export function regionAt(p: Vector3, anchors: Vector3[], left: number): number {
  const fromLeft = p.x < 0
  const start = fromLeft ? 0 : left
  const end = fromLeft ? left : anchors.length
  let best = -1
  let bestDist = Infinity
  for (let k = start; k < end; k++) {
    const dist = anchors[k].distanceToSquared(p)
    if (dist < bestDist) {
      bestDist = dist
      best = k
    }
  }
  return best
}

interface HullPart {
  positions: Float32Array
  index: Uint32Array
}

/** Casco de los dos hemisferios y el cerebelo en una sola malla */
export interface HullData {
  positions: Float32Array
  /** 1 = vértice del cerebelo (nunca se pinta) */
  parts: Float32Array
  index: Uint32Array
  /** Las caras a partir de este índice son del cerebelo (sin región) */
  cerebellumFrom: number
}

export interface BrainData {
  /**
   * Cintas: cada segmento son 4 vértices (extremo A/B × borde -1/+1) que el vertex shader
   * separa en pantalla para darle grosor real a la línea.
   */
  lines: {
    positions: Float32Array
    ends: Float32Array
    normals: Float32Array
    edges: Float32Array
    regions: Float32Array
    seeds: Float32Array
    sides: Float32Array
    kinds: Float32Array
    index: Uint32Array
  }
  hull: HullData
  /** Punto de anclaje (espacio local) de cada región: índice = id de región */
  anchors: Vector3[]
}

interface Segment {
  a: SurfacePoint
  b: SurfacePoint
  side: number
  kind: number
}

function buildHullPart(surface: (d: Vector3) => SurfacePoint, resU: number, resV: number): HullPart {
  const positions = new Float32Array((resU + 1) * (resV + 1) * 3)
  const dir = new Vector3()
  for (let j = 0; j <= resV; j++) {
    for (let i = 0; i <= resU; i++) {
      const { position } = surface(sphereDir((i / resU) * Math.PI * 2, (j / resV) * Math.PI, dir))
      positions.set([position.x, position.y, position.z], (j * (resU + 1) + i) * 3)
    }
  }
  const index = new Uint32Array(resU * resV * 6)
  let n = 0
  for (let j = 0; j < resV; j++) {
    for (let i = 0; i < resU; i++) {
      const a = j * (resU + 1) + i
      const b = a + 1
      const c = a + resU + 1
      const d = c + 1
      // orden antihorario visto desde fuera: las caras miran hacia afuera
      index.set([a, b, c, b, d, c], n)
      n += 6
    }
  }
  return { positions, index }
}

function mergeHull(parts: HullPart[], cerebellumPart: number): HullData {
  const positions = new Float32Array(parts.reduce((n, p) => n + p.positions.length, 0))
  const partOf = new Float32Array(positions.length / 3)
  const index = new Uint32Array(parts.reduce((n, p) => n + p.index.length, 0))
  let vertexOffset = 0
  let indexOffset = 0
  let cerebellumFrom = 0
  parts.forEach((part, k) => {
    if (k === cerebellumPart) cerebellumFrom = indexOffset / 3
    positions.set(part.positions, vertexOffset * 3)
    if (k === cerebellumPart) partOf.fill(1, vertexOffset, vertexOffset + part.positions.length / 3)
    index.set(
      part.index.map((i) => i + vertexOffset),
      indexOffset
    )
    vertexOffset += part.positions.length / 3
    indexOffset += part.index.length
  })
  return { positions, parts: partOf, index, cerebellumFrom }
}

/**
 * Regiones: 0 … left-1 = hemisferio izquierdo (lo técnico),
 * left … left+right-1 = hemisferio derecho (lo humano), -1 = cerebelo (sin región).
 */
export function buildBrain({
  detail,
  left,
  right,
  view,
}: {
  /** 1 = escritorio; valores menores aligeran la malla en móvil */
  detail: number
  left: number
  right: number
  view: number
}): BrainData {
  const leftDirs = regionDirections(left, -1, view)
  const rightDirs = regionDirections(right, 1, view)
  const anchors = [
    ...leftDirs.map((d) => hemisphereSurface(d, -1).position),
    ...rightDirs.map((d) => hemisphereSurface(d, 1).position),
  ]

  const resU = Math.round(420 * detail)
  const resV = Math.round(210 * detail)
  const segments: Segment[] = []

  for (const side of [-1, 1]) {
    const lateral = (d: Vector3) => d.x * side > 0.015
    const toSegments = (dirs: Vector3[], kind: number) => {
      for (let k = 0; k < dirs.length; k += 2) {
        segments.push({ a: hemisphereSurface(dirs[k], side), b: hemisphereSurface(dirs[k + 1], side), side, kind })
      }
    }
    // Circunvoluciones: quedan fuera las que cruzan los surcos principales, así estos se leen limpios
    toSegments(
      contour(
        foldField,
        (d) => lateral(d) && Math.abs(centralSulcus(d)) > 0.035 && (d.z < 0.05 || Math.abs(lateralFissure(d)) > 0.035),
        resU,
        resV
      ),
      LINE_KIND.sulcus
    )
    toSegments(contour(centralSulcus, (d) => lateral(d) && d.y > -0.1, resU, resV), LINE_KIND.major)
    toSegments(contour(lateralFissure, (d) => lateral(d) && d.z > 0.05 && d.y < 0.35, resU, resV), LINE_KIND.major)
    // Borde de la cisura longitudinal: el contorno interno de cada hemisferio
    toSegments(contour((d) => d.x * side, (d) => d.y > -0.35, resU, resV), LINE_KIND.major)
  }

  // Cerebelo: pliegues finos y paralelos
  const folia = contour((d) => Math.sin(d.y * 24), (d) => d.z < 0.35, Math.round(resU * 0.5), Math.round(resV * 0.7))
  for (let k = 0; k < folia.length; k += 2) {
    segments.push({
      a: cerebellumSurface(folia[k]),
      b: cerebellumSurface(folia[k + 1]),
      side: 0,
      kind: LINE_KIND.cerebellum,
    })
  }

  const count = segments.length
  const positions = new Float32Array(count * 12)
  const ends = new Float32Array(count * 12)
  const normals = new Float32Array(count * 12)
  const edges = new Float32Array(count * 4)
  const regions = new Float32Array(count * 4)
  const seeds = new Float32Array(count * 4)
  const sides = new Float32Array(count * 4)
  const kinds = new Float32Array(count * 4)
  const index = new Uint32Array(count * 6)

  // PRNG determinista: el mismo parpadeo en cada visita
  let seed = 7
  const rand = () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }
  const mid = new Vector3()

  segments.forEach((s, n) => {
    mid.copy(s.a.position).add(s.b.position).multiplyScalar(0.5)
    const region = s.side === 0 ? -1 : regionAt(mid, anchors, left)
    const r = rand()
    for (let v = 0; v < 4; v++) {
      const k = n * 4 + v
      const atB = v >= 2
      const self = atB ? s.b : s.a
      const other = atB ? s.a : s.b
      positions.set([self.position.x, self.position.y, self.position.z], k * 3)
      ends.set([other.position.x, other.position.y, other.position.z], k * 3)
      normals.set([self.normal.x, self.normal.y, self.normal.z], k * 3)
      // signo = lado de la cinta; magnitud 2 = extremo B (ahí el shader invierte la dirección
      // del trazo, que mira hacia A)
      edges[k] = (v % 2 === 0 ? -1 : 1) * (atB ? 2 : 1)
      regions[k] = region
      seeds[k] = r
      sides[k] = s.side
      kinds[k] = s.kind
    }
    const base = n * 4
    index.set([base, base + 2, base + 1, base + 1, base + 2, base + 3], n * 6)
  })

  const hullU = Math.round(96 * detail)
  const hullV = Math.round(64 * detail)
  const hull = mergeHull(
    [
      buildHullPart((d) => hemisphereSurface(d, -1, HULL_INSET), hullU, hullV),
      buildHullPart((d) => hemisphereSurface(d, 1, HULL_INSET), hullU, hullV),
      buildHullPart((d) => cerebellumSurface(d, HULL_INSET), Math.round(hullU * 0.6), Math.round(hullV * 0.6)),
    ],
    2
  )

  return {
    lines: { positions, ends, normals, edges, regions, seeds, sides, kinds, index },
    hull,
    anchors,
  }
}
