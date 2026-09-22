import { useEffect, useState, type RefObject } from 'react'

export interface CanvasSize {
  w: number
  h: number
  dpr: number
}

/** Ajusta la resolución del canvas a su tamaño en pantalla (nítido en pantallas retina) */
export function useCanvasSize(ref: RefObject<HTMLCanvasElement | null>): CanvasSize {
  const [size, setSize] = useState<CanvasSize>({ w: 0, h: 0, dpr: 1 })
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const observer = new ResizeObserver(() => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      setSize({ w, h, dpr })
    })
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [ref])
  return size
}

export function getContext(canvas: HTMLCanvasElement | null, size: CanvasSize) {
  const ctx = canvas?.getContext('2d')
  if (!ctx || size.w === 0) return null
  ctx.setTransform(size.dpr, 0, 0, size.dpr, 0, 0)
  return ctx
}
