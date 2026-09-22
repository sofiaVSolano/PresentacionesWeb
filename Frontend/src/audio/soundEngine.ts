/**
 * Motor de sonido sintetizado con Web Audio API — sin archivos de audio externos.
 * El AudioContext solo se crea/reanuda tras un gesto real del usuario (botón SOUND ON),
 * respetando las restricciones de autoplay del navegador y el punto 38 de la spec
 * (nunca reproducir audio automáticamente).
 */

let ctx: AudioContext | null = null

function getContext(): AudioContext {
  if (!ctx) ctx = new AudioContext()
  return ctx
}

export function primeAudio() {
  const context = getContext()
  if (context.state === 'suspended') context.resume()
}

function envelope(gainNode: GainNode, ctx: AudioContext, attack: number, decay: number, peak = 0.3) {
  const now = ctx.currentTime
  gainNode.gain.setValueAtTime(0, now)
  gainNode.gain.linearRampToValueAtTime(peak, now + attack)
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + attack + decay)
}

function tone(ctx: AudioContext, freq: number, start: number, duration: number, type: OscillatorType = 'sine', peak = 0.22) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.value = freq
  osc.connect(gain)
  gain.connect(ctx.destination)

  const now = ctx.currentTime + start
  gain.gain.setValueAtTime(0, now)
  gain.gain.linearRampToValueAtTime(peak, now + Math.min(0.03, duration * 0.2))
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)

  osc.start(now)
  osc.stop(now + duration + 0.05)
}

/** Whoosh ascendente — inicio del giro. Ruido filtrado con barrido de frecuencia hacia arriba. */
export function playWhooshRise() {
  const context = getContext()
  const duration = 0.7
  const bufferSize = context.sampleRate * duration
  const buffer = context.createBuffer(1, bufferSize, context.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1

  const noise = context.createBufferSource()
  noise.buffer = buffer

  const filter = context.createBiquadFilter()
  filter.type = 'bandpass'
  filter.Q.value = 0.8
  filter.frequency.setValueAtTime(300, context.currentTime)
  filter.frequency.exponentialRampToValueAtTime(3200, context.currentTime + duration)

  const gain = context.createGain()
  envelope(gain, context, 0.08, duration, 0.18)

  noise.connect(filter)
  filter.connect(gain)
  gain.connect(context.destination)
  noise.start()
  noise.stop(context.currentTime + duration + 0.05)
}

/** Blip muy corto y suave — hover sobre elementos interactivos. */
export function playBlip() {
  const context = getContext()
  tone(context, 1318.5, 0, 0.12, 'sine', 0.05)
}

/** Shimmer suave — cuando nace la línea de luz. Notas cristalinas muy tenues. */
export function playShimmer() {
  const context = getContext()
  const notes = [1046.5, 1396.9, 1760, 2093]
  notes.forEach((freq, i) => tone(context, freq, i * 0.07, 0.5, 'sine', 0.07))
}

/** Destello mágico — el "flash" de la revelación. Arpegio brillante y corto. */
export function playMagicFlash() {
  const context = getContext()
  const notes = [880, 1108.7, 1318.5, 1760]
  notes.forEach((freq, i) => tone(context, freq, i * 0.045, 0.35, 'triangle', 0.16))
}

/** Acorde cálido — cuando el avatar queda completamente revelado. */
export function playRevealChime() {
  const context = getContext()
  const chord = [523.25, 659.25, 783.99]
  chord.forEach((freq) => tone(context, freq, 0, 1.1, 'sine', 0.14))
}
