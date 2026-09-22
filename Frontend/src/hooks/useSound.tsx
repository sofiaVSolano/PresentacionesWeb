import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { primeAudio } from '@/audio/soundEngine'
import { primeSamples } from '@/audio/sample'
import { MusicLoop } from '@/audio/musicLoop'
import { SoundContext } from '@/audio/soundContext'
import { ambientMusic } from '@/data/audio'

/**
 * Música y efectos vienen encendidos, y cada uno se apaga por su lado.
 *
 * Ningún navegador deja sonar nada antes de que la persona interactúe con la
 * página: por eso el audio no arranca al cargar, sino en el primer clic, tecla
 * o rueda del ratón. Hasta entonces los botones ya se ven encendidos, que es lo
 * que van a encontrar cuando el sonido empiece.
 */
export function SoundProvider({ children }: { children: ReactNode }) {
  const [music, setMusic] = useState(true)
  const [effects, setEffects] = useState(true)
  const loopRef = useRef<MusicLoop | null>(null)
  const stateRef = useRef({ music: true, effects: true })
  const unlocked = useRef(false)

  useEffect(() => {
    const loop = new MusicLoop(ambientMusic)
    loopRef.current = loop
    return () => {
      loop.destroy()
      loopRef.current = null
    }
  }, [])

  useEffect(() => {
    stateRef.current = { music, effects }
  }, [music, effects])

  // El primer gesto de la persona es lo que desbloquea el audio en el navegador
  useEffect(() => {
    const events = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const
    const unlock = () => {
      if (unlocked.current) return
      unlocked.current = true
      events.forEach((event) => window.removeEventListener(event, unlock))
      if (stateRef.current.effects) {
        primeAudio()
        primeSamples()
      }
      if (stateRef.current.music) loopRef.current?.start()
    }
    events.forEach((event) => window.addEventListener(event, unlock, { passive: true }))
    return () => events.forEach((event) => window.removeEventListener(event, unlock))
  }, [])

  const toggleMusic = useCallback(() => {
    const next = !music
    unlocked.current = true // el propio clic ya sirve de gesto
    if (next) loopRef.current?.start()
    else loopRef.current?.stop()
    setMusic(next)
  }, [music])

  const toggleEffects = useCallback(() => {
    const next = !effects
    unlocked.current = true
    if (next) {
      primeAudio()
      primeSamples()
    }
    setEffects(next)
  }, [effects])

  const duckMusic = useCallback((ducked: boolean) => loopRef.current?.setDucked(ducked), [])

  const value = useMemo(
    () => ({ music, effects, enabled: effects, toggleMusic, toggleEffects, duckMusic }),
    [music, effects, toggleMusic, toggleEffects, duckMusic]
  )

  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>
}
