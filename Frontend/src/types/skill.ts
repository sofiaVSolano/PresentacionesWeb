import type { MindEffect } from '@/types/mind'

export type SkillCategory = 'ai' | 'frontend' | 'backend' | 'database' | 'tools'

export interface TechSkill {
  id: string
  name: string
  category: SkillCategory
  /** Qué es y qué papel cumple en mi stack — sin niveles de dominio */
  description: string
}

export interface SkillCategoryMeta {
  label: string
  /** Color de la categoría en la hélice y en la leyenda */
  color: string
}

export interface SoftSkill {
  id: string
  name: string
  /** Frase corta que aparece al pasar el cursor por la estrella */
  short: string
  description: string
  /** Efecto visual en la constelación al seleccionarla */
  effect: MindEffect
}
