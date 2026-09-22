/** Rampas de volumen para que arrancar y parar audio nunca suene a chasquido. */

const STEP_MS = 16

const clamp = (v: number) => Math.min(1, Math.max(0, v))

/**
 * Lleva el volumen de `el` hasta `target` en `ms` y se detiene sola al llegar.
 * Devuelve el id del intervalo para poder cancelarla si llega una rampa nueva.
 */
export function fadeVolume(el: HTMLAudioElement, target: number, ms: number, done?: () => void) {
  const goal = clamp(target)
  const delta = ((goal - el.volume) * STEP_MS) / Math.max(STEP_MS, ms)

  let id = 0
  id = window.setInterval(() => {
    const next = el.volume + delta
    const finished = delta >= 0 ? next >= goal : next <= goal
    el.volume = clamp(finished ? goal : next)
    if (finished) {
      window.clearInterval(id)
      done?.()
    }
  }, STEP_MS)
  return id
}
