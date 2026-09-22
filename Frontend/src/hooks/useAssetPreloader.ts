import { useEffect, useState } from 'react'

function loadImage(src: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve()
    img.onerror = () => resolve() // no bloquear la experiencia por un asset caído
    img.src = src
  })
}

export function useAssetPreloader(sources: string[]) {
  const [progress, setProgress] = useState(0)
  const [done, setDone] = useState(sources.length === 0)

  useEffect(() => {
    if (sources.length === 0) return

    let loaded = 0
    let cancelled = false

    Promise.all(
      sources.map((src) =>
        loadImage(src).then(() => {
          loaded += 1
          if (!cancelled) setProgress(Math.round((loaded / sources.length) * 100))
        })
      )
    ).then(() => {
      if (!cancelled) setDone(true)
    })

    return () => {
      cancelled = true
    }
  }, [sources])

  return { progress, done }
}
