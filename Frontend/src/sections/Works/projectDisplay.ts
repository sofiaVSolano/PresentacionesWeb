import type { Project, ProjectStatus } from '@/types/project'
import { hasValue } from '@/data/hasValue'

export { hasValue }

export const STATUS_LABEL: Record<ProjectStatus, string> = {
  live: 'En producción',
  'in-progress': 'En desarrollo',
  completed: 'Completado',
  research: 'Investigación',
  'por-definir': 'Ficha en construcción',
}

export const isLive = (project: Project) => project.status === 'live' && hasValue(project.demoUrl)

/** Paleta de los planetas: combinaciones del sistema de color del sitio */
export const PLANET_PALETTE: [string, string][] = [
  ['#9e2637', '#f3e7dc'],
  ['#d6708a', '#4a0710'],
  ['#c9a27e', '#7a1020'],
  ['#6fb6c9', '#210308'],
  ['#e8d9cb', '#9e2637'],
  ['#7a1020', '#d6708a'],
  ['#b9b2b8', '#4a0710'],
  ['#e38aa2', '#f3e7dc'],
  ['#5a1a2a', '#c9a27e'],
]
