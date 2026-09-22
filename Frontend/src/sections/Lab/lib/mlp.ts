/**
 * Perceptrón multicapa mínimo (tanh en capas ocultas, sigmoide a la salida) con
 * descenso de gradiente estocástico. Suficiente para aprender fronteras no lineales en 2D.
 */
export class TinyMLP {
  private readonly sizes: number[]
  private weights: number[][][] = []
  private biases: number[][] = []

  constructor(sizes: number[]) {
    this.sizes = sizes
    this.reset()
  }

  reset() {
    this.weights = []
    this.biases = []
    for (let l = 1; l < this.sizes.length; l++) {
      const fanIn = this.sizes[l - 1]
      const scale = Math.sqrt(2 / fanIn)
      this.weights.push(
        Array.from({ length: this.sizes[l] }, () =>
          Array.from({ length: fanIn }, () => (Math.random() * 2 - 1) * scale)
        )
      )
      this.biases.push(Array.from({ length: this.sizes[l] }, () => 0))
    }
  }

  /** Activaciones de todas las capas; la última tiene un único valor en (0, 1) */
  private forward(input: number[]): number[][] {
    const acts = [input]
    for (let l = 0; l < this.weights.length; l++) {
      const last = l === this.weights.length - 1
      const prev = acts[l]
      acts.push(
        this.weights[l].map((row, j) => {
          let z = this.biases[l][j]
          for (let k = 0; k < row.length; k++) z += row[k] * prev[k]
          return last ? 1 / (1 + Math.exp(-z)) : Math.tanh(z)
        })
      )
    }
    return acts
  }

  predict(x: number, y: number): number {
    const acts = this.forward([x, y])
    return acts[acts.length - 1][0]
  }

  /** Un paso de entrenamiento; devuelve la pérdida (entropía cruzada) de esa muestra */
  train(x: number, y: number, target: number, lr: number): number {
    const acts = this.forward([x, y])
    const out = acts[acts.length - 1][0]
    // sigmoide + entropía cruzada: el gradiente de la salida es (salida - objetivo)
    let delta = [out - target]
    for (let l = this.weights.length - 1; l >= 0; l--) {
      const prev = acts[l]
      const nextDelta = new Array(prev.length).fill(0)
      for (let j = 0; j < this.weights[l].length; j++) {
        const row = this.weights[l][j]
        for (let k = 0; k < row.length; k++) {
          nextDelta[k] += row[k] * delta[j]
          row[k] -= lr * delta[j] * prev[k]
        }
        this.biases[l][j] -= lr * delta[j]
      }
      if (l > 0) delta = nextDelta.map((d, k) => d * (1 - prev[k] * prev[k])) // derivada de tanh
    }
    const p = Math.min(Math.max(out, 1e-7), 1 - 1e-7)
    return -(target * Math.log(p) + (1 - target) * Math.log(1 - p))
  }
}

export interface LabeledPoint {
  x: number
  y: number
  label: 0 | 1
}

export type DatasetName = 'circles' | 'xor' | 'spiral'

export function makeDataset(name: DatasetName, count = 120): LabeledPoint[] {
  const points: LabeledPoint[] = []
  for (let i = 0; i < count; i++) {
    if (name === 'circles') {
      const inner = i % 2 === 0
      const r = inner ? Math.random() * 0.38 : 0.58 + Math.random() * 0.32
      const a = Math.random() * Math.PI * 2
      points.push({ x: Math.cos(a) * r, y: Math.sin(a) * r, label: inner ? 1 : 0 })
    } else if (name === 'xor') {
      const x = Math.random() * 1.8 - 0.9
      const y = Math.random() * 1.8 - 0.9
      if (Math.abs(x) < 0.08 || Math.abs(y) < 0.08) continue
      points.push({ x, y, label: x * y > 0 ? 1 : 0 })
    } else {
      const label = (i % 2) as 0 | 1
      const t = (i / count) * 3.2 + 0.25
      const a = t * 2.2 + label * Math.PI
      const r = t * 0.26
      points.push({
        x: Math.cos(a) * r + (Math.random() - 0.5) * 0.06,
        y: Math.sin(a) * r + (Math.random() - 0.5) * 0.06,
        label,
      })
    }
  }
  return points
}
