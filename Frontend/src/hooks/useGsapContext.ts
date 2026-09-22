import { useEffect, type DependencyList, type RefObject } from 'react'
import { gsap } from '@/animations/gsap'

/**
 * Ejecuta `effect` dentro de un gsap.context() acotado a `scope` y limpia
 * automáticamente todas las animaciones/ScrollTriggers creados al desmontar
 * o cuando cambian las dependencias.
 */
export function useGsapContext(
  effect: (context: gsap.Context) => void,
  deps: DependencyList,
  scope?: RefObject<Element | null>
) {
  useEffect(() => {
    const ctx = gsap.context(effect, scope?.current ?? undefined)
    return () => ctx.revert()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
