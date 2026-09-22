// Generado por scripts/extract_frames.py — no editar a mano.
export const videoFrames = {
  transformation: {
    count: 120,
    basePath: '/assets/transformation',
    sizes: { lg: { width: 1280, height: 720 }, sm: { width: 960, height: 540 } },
  },
  curtain: {
    count: 120,
    basePath: '/assets/curtain',
    sizes: { lg: { width: 1280, height: 720 }, sm: { width: 960, height: 540 } },
  },
} as const

export type VideoName = keyof typeof videoFrames
