import type { SoundEffect } from '@/types/audio'

// Golpe que acompaña el instante en que la fotografía se convierte en el avatar.
export const transformationSound: SoundEffect = {
  id: 'transformation',
  src: '/assets/sounds/transicion.mp3',
  volume: 0.7,
}

// Sonido propio del video del telón, extraído del MP4 (ver scripts/extract_audio.mjs).
// Suena bajito: acompaña la apertura, no la anuncia.
export const curtainSound: SoundEffect = {
  id: 'curtain',
  src: '/assets/sounds/telon.aac',
  volume: 0.3,
}

// Música ambiente. Es un bucle corto y se cruza consigo mismo, así que suena
// continua; el volumen es bajo a propósito: acompaña, no compite con la lectura.
export const ambientMusic: SoundEffect = {
  id: 'lofi',
  src: '/assets/sounds/lofi-loop.mp3',
  volume: 0.08,
}

/** Instante del video (0 → 1) en el que se dispara el golpe: cuando empieza la conversión */
export const TRANSFORMATION_CUE = 0.2

// El resto de sonidos de interfaz se sintetizan en `@/audio/soundEngine`.
export const soundEffects: SoundEffect[] = [transformationSound, curtainSound, ambientMusic]
