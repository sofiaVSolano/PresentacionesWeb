export interface UniversePlanet {
  id: string
  title: string
  base: string
  accent: string
  size: number
  featured: boolean
  live: boolean
}

export interface UniverseSceneProps {
  planets: UniversePlanet[]
  hovered: string | null
  selected: string | null
  /** Pantallas estrechas: órbitas más juntas para que el sistema quepa */
  compact: boolean
  /** Hay sitio a la derecha para la ficha: la cámara deja el planeta a la izquierda */
  sidePanel: boolean
  active: boolean
  reducedMotion: boolean
  /** 0 = todo en el centro (big bang), 1 = planetas en sus órbitas */
  assembleRef: { current: number }
  onHover: (id: string | null) => void
  onSelect: (id: string | null) => void
}
