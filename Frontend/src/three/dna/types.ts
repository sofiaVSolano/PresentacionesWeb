import type { SkillCategory } from '@/types/skill'

export interface DnaBead {
  id: string
  name: string
  category: SkillCategory
  color: string
}

/** Valor mutable compartido entre el DOM (ScrollTrigger) y el loop 3D, sin re-renders */
export interface MutableValue {
  current: number
}

export interface DnaSceneProps {
  items: DnaBead[]
  hovered: string | null
  selected: string | null
  category: SkillCategory | null
  /** Hélice acostada (desktop) o de pie (móvil) */
  horizontal: boolean
  /** false = sección fuera de pantalla: el canvas deja de renderizar */
  active: boolean
  reducedMotion: boolean
  /** 0 = piezas dispersas, 1 = hélice ensamblada */
  assembleRef: MutableValue
  /** Progreso del scroll a través de la sección (añade giro) */
  scrollRef: MutableValue
  onHover: (id: string | null) => void
  onSelect: (id: string) => void
}
