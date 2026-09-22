/**
 * Música de fondo en bucle continuo.
 *
 * El recorte del mix no está cortado en un compás exacto, así que en vez de
 * repetirlo en seco se usan dos reproductores: cuando al primero le quedan unos
 * segundos, el segundo arranca desde el principio y se cruzan. El empalme deja
 * de oírse y la música parece no terminar nunca.
 *
 * Todo el volumen pasa por `level` (encendido/apagado) y `duck` (bajar el
 * volumen un momento para que se oiga otra cosa), así nunca se pisan entre sí.
 */

const TICK_MS = 50
const CROSSFADE_S = 3
const DUCK_LEVEL = 0.25

interface Options {
  src: string
  volume?: number
  fadeMs?: number
}

export class MusicLoop {
  private players: [HTMLAudioElement, HTMLAudioElement]
  private active = 0
  private mixing = false
  private base: number
  private fadeMs: number

  private level = 0
  private targetLevel = 0
  private duck = 1
  private targetDuck = 1
  private timer = 0
  private started = false

  constructor({ src, volume = 0.22, fadeMs = 1400 }: Options) {
    this.base = volume
    this.fadeMs = fadeMs
    this.players = [new Audio(), new Audio()]
    for (const el of this.players) {
      el.preload = 'none'
      el.src = src
      el.volume = 0
    }
  }

  /** Se llama desde el gesto de la persona: sin eso el navegador no deja sonar nada */
  start() {
    this.targetLevel = 1
    if (!this.started) {
      this.started = true
      // solo el primero descarga ahora; el segundo espera al primer cruce
      this.players[0].preload = 'auto'
      this.players[0].play().catch(() => {})
    } else if (this.players[this.active].paused) {
      this.players[this.active].play().catch(() => {})
    }
    this.run()
  }

  stop() {
    this.targetLevel = 0
    this.run()
  }

  /** Baja la música mientras suena un efecto, y la devuelve luego a su sitio */
  setDucked(ducked: boolean) {
    this.targetDuck = ducked ? DUCK_LEVEL : 1
    this.run()
  }

  destroy() {
    window.clearInterval(this.timer)
    for (const el of this.players) {
      el.pause()
      el.removeAttribute('src')
    }
  }

  private run() {
    if (this.timer) return
    this.timer = window.setInterval(() => this.tick(), TICK_MS)
  }

  private tick() {
    this.level = approach(this.level, this.targetLevel, TICK_MS / this.fadeMs)
    this.duck = approach(this.duck, this.targetDuck, TICK_MS / 400)

    const current = this.players[this.active]
    const other = this.players[1 - this.active]
    const gain = this.base * this.level * this.duck

    // ¿Toca empezar a cruzar con el otro reproductor?
    const remaining = Number.isFinite(current.duration) ? current.duration - current.currentTime : Infinity
    if (!this.mixing && remaining <= CROSSFADE_S && this.level > 0) {
      this.mixing = true
      other.preload = 'auto'
      other.currentTime = 0
      other.volume = 0
      other.play().catch(() => {})
    }

    if (this.mixing) {
      const mix = Math.min(1, Math.max(0, (CROSSFADE_S - remaining) / CROSSFADE_S))
      // curva de potencia constante: sin ella el cruce se oiría como un bajón
      current.volume = gain * Math.sqrt(1 - mix)
      other.volume = gain * Math.sqrt(mix)
      if (mix >= 1 || current.ended) {
        current.pause()
        current.currentTime = 0
        this.active = 1 - this.active
        this.mixing = false
      }
    } else {
      current.volume = gain
    }

    // Apagada del todo: se detiene el intervalo para no gastar ciclos de fondo.
    // Si se apagó en mitad de un cruce, se deshace para que al volver a encender
    // siga sonando un solo reproductor y el cruce pueda empezar de nuevo.
    if (this.targetLevel === 0 && this.level === 0) {
      if (this.mixing) {
        other.pause()
        other.currentTime = 0
        this.mixing = false
      }
      for (const el of this.players) el.pause()
      window.clearInterval(this.timer)
      this.timer = 0
    }
  }
}

function approach(value: number, target: number, step: number) {
  if (value < target) return Math.min(target, value + step)
  if (value > target) return Math.max(target, value - step)
  return target
}
