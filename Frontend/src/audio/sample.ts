import { fadeVolume } from './fade'

// Los navegadores solo dejan sonar audio después de que la persona interactúe.
// Aquí se anotan todos los efectos para desbloquearlos de golpe en ese gesto.
const registry = new Set<Sample>()
let unlocked = false

export function primeSamples() {
  unlocked = true
  registry.forEach((sample) => sample.prime())
}

/**
 * Un efecto puntual: se dispara entero, en su momento exacto, y se deja sonar.
 *
 * El archivo no se descarga hasta que la persona activa el sonido, así que la
 * página sigue cargando igual de rápido para quien la recorre en silencio.
 */
export class Sample {
  private el: HTMLAudioElement
  private volume: number
  private ready = false
  private wanted = false // la página ha pedido que suene de verdad

  constructor({ src, volume = 0.8 }: { src: string; volume?: number }) {
    this.el = new Audio()
    this.el.preload = 'none'
    this.el.src = src
    this.volume = volume
    registry.add(this)
    if (unlocked) this.prime() // el sonido ya estaba activado antes de montar esta sección
  }

  /** Se llama dentro del gesto que activa el sonido: descarga y desbloquea la reproducción */
  prime() {
    if (this.ready) return
    this.ready = true
    this.el.preload = 'auto'
    this.el.volume = 0
    this.el
      .play()
      .then(() => {
        // Si el archivo tardó en cargar, esta promesa puede resolverse cuando la
        // página ya lo está reproduciendo de verdad: entonces no hay que tocarlo.
        if (this.wanted) return
        this.el.pause()
        this.el.currentTime = 0
      })
      .catch(() => {})
  }

  /** Suena desde el principio; si ya estaba sonando, vuelve a empezar */
  play() {
    this.wanted = true
    this.el.currentTime = 0
    this.el.volume = this.volume
    this.el.play().catch(() => {})
  }

  stop(fadeMs = 200) {
    this.wanted = false
    if (this.el.paused) return
    fadeVolume(this.el, 0, fadeMs, () => {
      this.el.pause()
      this.el.currentTime = 0
    })
  }

  /** Cuánto dura, para coordinar con ella otras cosas (p. ej. bajar la música) */
  get duration() {
    return Number.isFinite(this.el.duration) ? this.el.duration : 0
  }

  destroy() {
    registry.delete(this)
    this.el.pause()
    this.el.removeAttribute('src')
  }
}
