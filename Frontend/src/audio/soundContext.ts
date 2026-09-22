import { createContext, useContext } from 'react'

export interface SoundContextValue {
  /** Música ambiente de fondo */
  music: boolean
  /** Efectos ligados a la interacción y al scroll */
  effects: boolean
  /** Alias de `effects`: lo que consultan las secciones antes de sonar */
  enabled: boolean
  toggleMusic: () => void
  toggleEffects: () => void
  /** Baja la música un momento para que se oiga un efecto por encima */
  duckMusic: (ducked: boolean) => void
}

export const SoundContext = createContext<SoundContextValue | null>(null)

export function useSound() {
  const ctx = useContext(SoundContext)
  if (!ctx) throw new Error('useSound debe usarse dentro de SoundProvider')
  return ctx
}
