/**
 * Saca la pista de audio AAC de un MP4 y la guarda como .aac (ADTS), sin recodificar.
 *
 * Los videos de la web se sirven como fotogramas WebP, así que el MP4 entero no
 * llega al navegador; si además lleva sonido hay que sacarlo aparte. Un .aac con
 * cabeceras ADTS lo reproduce cualquier navegador actual.
 *
 *   node scripts/extract_audio.mjs <entrada.mp4> <salida.aac>
 */
import { readFileSync, writeFileSync } from 'node:fs'

const SAMPLE_RATES = [
  96000, 88200, 64000, 48000, 44100, 32000, 24000, 22050, 16000, 12000, 11025, 8000, 7350,
]

/** Recorre los átomos de un MP4 y llama a `visit` con cada uno */
function walk(buf, start, end, visit) {
  let cursor = start
  while (cursor + 8 <= end) {
    let size = buf.readUInt32BE(cursor)
    const type = buf.toString('latin1', cursor + 4, cursor + 8)
    let header = 8
    if (size === 1) {
      size = Number(buf.readBigUInt64BE(cursor + 8))
      header = 16
    }
    if (size < header || cursor + size > end) break
    visit(type, cursor + header, cursor + size)
    cursor += size
  }
}

/** Contenedores que hay que abrir para llegar a las tablas del audio */
const CONTAINERS = new Set(['moov', 'trak', 'mdia', 'minf', 'stbl', 'edts', 'udta'])

function findAudioTrack(buf) {
  let found = null

  const scanTrak = (start, end) => {
    const track = { isAudio: false }
    const descend = (from, to) => {
      walk(buf, from, to, (type, bodyStart, bodyEnd) => {
        if (CONTAINERS.has(type)) return descend(bodyStart, bodyEnd)
        if (type === 'hdlr') {
          track.isAudio = buf.toString('latin1', bodyStart + 8, bodyStart + 12) === 'soun'
        } else if (type === 'stsd') {
          track.stsd = [bodyStart, bodyEnd]
        } else if (type === 'stsz') {
          track.stsz = [bodyStart, bodyEnd]
        } else if (type === 'stsc') {
          track.stsc = [bodyStart, bodyEnd]
        } else if (type === 'stco' || type === 'co64') {
          track.chunks = [bodyStart, bodyEnd, type]
        }
      })
    }
    descend(start, end)
    if (track.isAudio) found = track
  }

  walk(buf, 0, buf.length, (type, s, e) => {
    if (type !== 'moov') return
    walk(buf, s, e, (t2, s2, e2) => {
      if (t2 === 'trak') scanTrak(s2, e2)
    })
  })
  return found
}

/** Del átomo `esds` salen el perfil, la frecuencia y los canales que pide ADTS */
function readConfig(buf, stsdStart) {
  // stsd: 4 versión/flags + 4 nº entradas, luego la entrada `mp4a`
  const entry = stsdStart + 8
  const channels = buf.readUInt16BE(entry + 24)
  const sampleRate = buf.readUInt32BE(entry + 32) >> 16

  // El `esds` va dentro de la entrada; se busca su firma
  const esds = buf.indexOf(Buffer.from('esds', 'latin1'), entry)
  let profile = 2 // AAC-LC por defecto
  let rateIndex = SAMPLE_RATES.indexOf(sampleRate)
  let channelConfig = channels

  if (esds > 0) {
    // DecoderSpecificInfo (tag 0x05) lleva los 2 bytes de AudioSpecificConfig
    const tag = buf.indexOf(Buffer.from([0x05]), esds + 8)
    if (tag > 0) {
      let p = tag + 1
      while (buf[p] & 0x80) p++ // longitud en bytes de 7 bits
      p++
      const asc = (buf[p] << 8) | buf[p + 1]
      profile = (asc >> 11) & 0x1f
      rateIndex = (asc >> 7) & 0x0f
      channelConfig = (asc >> 3) & 0x0f
    }
  }
  if (rateIndex < 0) rateIndex = 4 // 44100
  return { profile, rateIndex, channelConfig }
}

function adtsHeader(length, { profile, rateIndex, channelConfig }) {
  const total = length + 7
  return Buffer.from([
    0xff,
    0xf1, // MPEG-4, sin CRC
    ((profile - 1) << 6) | (rateIndex << 2) | ((channelConfig >> 2) & 1),
    ((channelConfig & 3) << 6) | ((total >> 11) & 0x03),
    (total >> 3) & 0xff,
    ((total & 7) << 5) | 0x1f,
    0xfc,
  ])
}

const [input, output] = process.argv.slice(2)
if (!input || !output) {
  console.error('uso: node scripts/extract_audio.mjs <entrada.mp4> <salida.aac>')
  process.exit(1)
}

const buf = readFileSync(input)
const track = findAudioTrack(buf)
if (!track?.stsz || !track.stsc || !track.chunks) {
  console.error('El MP4 no tiene una pista de audio AAC legible.')
  process.exit(1)
}

const config = readConfig(buf, track.stsd[0])

// Tamaño de cada muestra
const [szStart] = track.stsz
const uniformSize = buf.readUInt32BE(szStart + 4)
const sampleCount = buf.readUInt32BE(szStart + 8)
const sizes = []
for (let i = 0; i < sampleCount; i++) {
  sizes.push(uniformSize || buf.readUInt32BE(szStart + 12 + i * 4))
}

// Offset de cada chunk
const [coStart, , coType] = track.chunks
const chunkCount = buf.readUInt32BE(coStart + 4)
const chunkOffsets = []
for (let i = 0; i < chunkCount; i++) {
  chunkOffsets.push(
    coType === 'co64'
      ? Number(buf.readBigUInt64BE(coStart + 8 + i * 8))
      : buf.readUInt32BE(coStart + 8 + i * 4)
  )
}

// Cuántas muestras lleva cada chunk
const [scStart] = track.stsc
const entryCount = buf.readUInt32BE(scStart + 4)
const runs = []
for (let i = 0; i < entryCount; i++) {
  const p = scStart + 8 + i * 12
  runs.push({ first: buf.readUInt32BE(p), perChunk: buf.readUInt32BE(p + 4) })
}

const pieces = []
let sample = 0
for (let chunk = 0; chunk < chunkOffsets.length && sample < sizes.length; chunk++) {
  let perChunk = runs[0].perChunk
  for (const run of runs) if (chunk + 1 >= run.first) perChunk = run.perChunk
  let offset = chunkOffsets[chunk]
  for (let i = 0; i < perChunk && sample < sizes.length; i++, sample++) {
    const size = sizes[sample]
    pieces.push(adtsHeader(size, config), buf.subarray(offset, offset + size))
    offset += size
  }
}

const out = Buffer.concat(pieces)
writeFileSync(output, out)
console.log(
  `${output}: ${sample} muestras · ${(out.length / 1024).toFixed(0)} KB · ` +
    `${SAMPLE_RATES[config.rateIndex]} Hz · ${config.channelConfig} canal(es)`
)
