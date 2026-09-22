/**
 * Patrón de luz sobre el cerebro al seleccionar una idea:
 * pulse = la región late · waves = ondas que recorren todo el cerebro · network = otras regiones responden
 */
export type MindEffect = 'pulse' | 'waves' | 'network'

export interface MindItem {
  id: string
  label: string
  /** Frase corta que aparece al pasar el cursor */
  short: string
  description: string
  /** ids de `techSkills` que se muestran como chips en el detalle */
  skills?: string[]
  effect?: MindEffect
}
