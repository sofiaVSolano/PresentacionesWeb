import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { useAssetPreloader } from '@/hooks/useAssetPreloader'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { profile } from '@/data/profile'
import './Preloader.css'

const CRITICAL_ASSETS = [
  '/assets/character/sofia-real-cutout.png',
  '/assets/character/sofia-avatar-cutout.png',
]

interface PreloaderProps {
  onComplete: () => void
}

export function Preloader({ onComplete }: PreloaderProps) {
  const { progress, done } = useAssetPreloader(CRITICAL_ASSETS)
  const rootRef = useRef<HTMLDivElement>(null)
  const prefersReducedMotion = usePrefersReducedMotion()

  useEffect(() => {
    if (!done || !rootRef.current) return

    gsap.to(rootRef.current, {
      opacity: 0,
      duration: prefersReducedMotion ? 0.15 : 0.6,
      ease: 'power2.out',
      onComplete,
    })
  }, [done, onComplete, prefersReducedMotion])

  return (
    <div className="preloader" ref={rootRef} role="status" aria-live="polite">
      <p className="preloader__name font-display">{profile.shortName}</p>
      <p className="preloader__label">Loading Experience</p>
      <div className="preloader__bar">
        <div
          className="preloader__bar-fill"
          style={{ '--preloader-progress': `${progress}%` } as React.CSSProperties}
        />
      </div>
      <p className="preloader__count">{progress}%</p>
    </div>
  )
}
