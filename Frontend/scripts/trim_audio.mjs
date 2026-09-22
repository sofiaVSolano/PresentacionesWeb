/**
 * Recorta un MP3 por fotogramas, sin recodificar (no se pierde calidad).
 *
 * Los fotogramas MP3 se decodifican de forma independiente, así que cortar en un
 * límite de fotograma produce un archivo válido. Se usa para sacar el bucle de
 * música de fondo del mix largo que vive en source-assets/.
 *
 *   node scripts/trim_audio.mjs <entrada> <salida> <inicio_s> <duracion_s>
 */
import { readFileSync, writeFileSync } from 'node:fs'

const BITRATES = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320]
const SAMPLE_RATES = [44100, 48000, 32000]
const SAMPLES_PER_FRAME = 1152

/** Devuelve el offset de cada fotograma y la duración total */
function parseFrames(buffer) {
  let cursor = 0
  if (buffer.toString('latin1', 0, 3) === 'ID3') {
    const size =
      ((buffer[6] & 127) << 21) | ((buffer[7] & 127) << 14) | ((buffer[8] & 127) << 7) | (buffer[9] & 127)
    cursor = 10 + size
  }

  const frames = []
  let sampleRate = 44100
  while (cursor < buffer.length - 4) {
    if (buffer[cursor] !== 0xff || (buffer[cursor + 1] & 0xe0) !== 0xe0) {
      cursor++
      continue
    }
    const header = buffer[cursor + 2]
    const bitrate = BITRATES[(header >> 4) & 15] * 1000
    const rate = SAMPLE_RATES[(header >> 2) & 3]
    if (!bitrate || !rate) {
      cursor++
      continue
    }
    sampleRate = rate
    const length = Math.floor((144 * bitrate) / rate) + ((header >> 1) & 1)
    frames.push(cursor)
    cursor += length
  }
  return { frames, sampleRate }
}

const [input, output, startArg, durationArg] = process.argv.slice(2)
if (!input || !output) {
  console.error('uso: node scripts/trim_audio.mjs <entrada> <salida> <inicio_s> <duracion_s>')
  process.exit(1)
}

const buffer = readFileSync(input)
const { frames, sampleRate } = parseFrames(buffer)
const framesPerSecond = sampleRate / SAMPLES_PER_FRAME

const firstFrame = Math.floor(Number(startArg ?? 0) * framesPerSecond)
const frameCount = Math.floor(Number(durationArg ?? 60) * framesPerSecond)
const lastFrame = Math.min(frames.length - 1, firstFrame + frameCount)

if (firstFrame >= frames.length) {
  console.error(`El inicio cae fuera del archivo (dura ${(frames.length / framesPerSecond).toFixed(1)} s)`)
  process.exit(1)
}

// Sin etiqueta ID3: el recorte es solo audio, y así pesa unos bytes menos
writeFileSync(output, buffer.subarray(frames[firstFrame], frames[lastFrame]))

const seconds = (lastFrame - firstFrame) / framesPerSecond
const size = frames[lastFrame] - frames[firstFrame]
console.log(
  `${output}: ${seconds.toFixed(1)} s · ${(size / 1024 / 1024).toFixed(2)} MB ` +
    `(de ${(frames.length / framesPerSecond / 60).toFixed(1)} min originales)`
)
