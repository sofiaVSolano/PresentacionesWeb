import type { MindEffect } from '@/types/mind'

/** Posición en pantalla (px, relativa al canvas) de la región activa, para dibujar el cable de luz */
export interface BrainAnchor {
  x: number
  y: number
  visible: boolean
}

export interface BrainSceneProps {
  /** Nº de regiones en el hemisferio izquierdo (lo técnico) y derecho (lo humano) */
  leftCount: number
  rightCount: number
  /** Región enfocada (hover o selección de una idea), o null: recibe el cable de luz */
  activeRegion: number | null
  /** Regiones que se iluminan juntas (p. ej. todas las que usan una tecnología del stack) */
  highlighted: number[]
  /** Hay una ficha abierta: el cerebro sube y se reduce para dejarle sitio */
  panelOpen: boolean
  effect: MindEffect
  compact: boolean
  active: boolean
  reducedMotion: boolean
  /** 0 → 1: avance del escaneo de entrada (lo escribe un ScrollTrigger) */
  introRef: { current: number }
  anchorRef: { current: BrainAnchor }
  onHoverRegion: (region: number | null) => void
  onSelectRegion: (region: number) => void
}
