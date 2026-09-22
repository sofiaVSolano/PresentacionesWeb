import { useEffect, useRef, type ReactNode } from 'react'
import { ReactLenis, useLenis, type LenisRef } from 'lenis/react'
import { gsap, ScrollTrigger } from '@/animations/gsap'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import 'lenis/dist/lenis.css'

interface SmoothScrollProviderProps {
  children: ReactNode
}

function LenisScrollTriggerSync() {
  useLenis(() => ScrollTrigger.update())
  return null
}

/**
 * Sincroniza Lenis con el ticker de GSAP para que ScrollTrigger reciba
 * exactamente el mismo valor de scroll que el usuario ve (sin doble rAF).
 * Con prefers-reduced-motion, se omite el scroll suave y se usa el nativo.
 */
export function SmoothScrollProvider({ children }: SmoothScrollProviderProps) {
  const lenisRef = useRef<LenisRef>(null)
  const prefersReducedMotion = usePrefersReducedMotion()

  useEffect(() => {
    if (prefersReducedMotion) return

    function onTick(time: number) {
      lenisRef.current?.lenis?.raf(time * 1000)
    }

    gsap.ticker.add(onTick)
    gsap.ticker.lagSmoothing(0)

    return () => gsap.ticker.remove(onTick)
  }, [prefersReducedMotion])

  if (prefersReducedMotion) return <>{children}</>

  return (
    <ReactLenis root ref={lenisRef} options={{ autoRaf: false, lerp: 0.1, wheelMultiplier: 1 }}>
      <LenisScrollTriggerSync />
      {children}
    </ReactLenis>
  )
}
