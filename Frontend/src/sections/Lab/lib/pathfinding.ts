export type Algorithm = 'dp' | 'greedy'

export interface World {
  cols: number
  rows: number
  walls: Uint8Array
  start: number
  goal: number
}

export interface SearchResult {
  /** celdas en el orden en que se exploraron */
  visited: number[]
  /** ruta encontrada (vacía si no hay) */
  path: number[]
}

export function neighbors(i: number, cols: number, rows: number): number[] {
  const x = i % cols
  const y = Math.floor(i / cols)
  const out: number[] = []
  if (y > 0) out.push(i - cols)
  if (x < cols - 1) out.push(i + 1)
  if (y < rows - 1) out.push(i + cols)
  if (x > 0) out.push(i - 1)
  return out
}

/**
 * - 'dp': programación dinámica sobre la tabla de costos mínimos (en una rejilla de costo
 *   uniforme equivale a recorrer por capas de distancia): siempre encuentra la ruta más corta.
 * - 'greedy': Greedy Best-First, expande siempre la celda que parece más cerca de la meta
 *   (distancia Manhattan). Suele explorar menos, pero no garantiza la ruta más corta.
 */
export function search(algorithm: Algorithm, world: World): SearchResult {
  const { cols, rows, walls, start, goal } = world
  const n = cols * rows
  const prev = new Int32Array(n).fill(-1)
  const seen = new Uint8Array(n)
  const visited: number[] = []
  const gx = goal % cols
  const gy = Math.floor(goal / cols)
  const h = (i: number) => Math.abs((i % cols) - gx) + Math.abs(Math.floor(i / cols) - gy)

  const frontier = [start]
  seen[start] = 1
  let found = false

  while (frontier.length) {
    let pick = 0
    if (algorithm === 'greedy') {
      for (let k = 1; k < frontier.length; k++) if (h(frontier[k]) < h(frontier[pick])) pick = k
    }
    const current = frontier.splice(pick, 1)[0]
    visited.push(current)
    if (current === goal) {
      found = true
      break
    }
    for (const next of neighbors(current, cols, rows)) {
      if (seen[next] || walls[next]) continue
      seen[next] = 1
      prev[next] = current
      frontier.push(next)
    }
  }

  const path: number[] = []
  if (found) {
    for (let at = goal; at !== -1; at = prev[at]) path.unshift(at)
  }
  return { visited, path }
}

/** Escenario inicial: una "C" abierta hacia la salida, donde Greedy se mete en el bolsillo */
export function createWorld(cols: number, rows: number): World {
  const walls = new Uint8Array(cols * rows)
  const mid = Math.floor(rows / 2)
  const start = mid * cols + 2
  const goal = mid * cols + (cols - 3)
  const wx = Math.floor(cols * 0.6)
  const top = 2
  const bottom = rows - 3
  const depth = Math.max(4, Math.floor(cols * 0.22))
  for (let y = top; y <= bottom; y++) walls[y * cols + wx] = 1
  for (let x = wx - depth; x <= wx; x++) {
    walls[top * cols + x] = 1
    walls[bottom * cols + x] = 1
  }
  return { cols, rows, walls, start, goal }
}

export function randomWalls(world: World, density = 0.27): World {
  const walls = new Uint8Array(world.cols * world.rows)
  for (let i = 0; i < walls.length; i++) {
    if (i !== world.start && i !== world.goal && Math.random() < density) walls[i] = 1
  }
  return { ...world, walls }
}
