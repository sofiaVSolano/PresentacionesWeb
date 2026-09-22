import { useRef } from 'react'
import { gsap } from '@/animations/gsap'
import { useGsapContext } from '@/hooks/useGsapContext'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { KineticText } from '@/components/KineticText/KineticText'
import { SectionHeading } from '@/components/SectionHeading/SectionHeading'
import { PathfindingExperiment } from './experiments/PathfindingExperiment'
import { NeuralExperiment } from './experiments/NeuralExperiment'
import { ConvolutionExperiment } from './experiments/ConvolutionExperiment'
import './Lab.css'

export function Lab() {
  const sectionRef = useRef<HTMLElement>(null)
  const prefersReducedMotion = usePrefersReducedMotion()

  // Cada módulo "se enciende": aparece desde abajo con un destello de su borde
  useGsapContext(
    () => {
      if (prefersReducedMotion) return
      gsap.utils.toArray<HTMLElement>('.lab__module').forEach((module) => {
        gsap.fromTo(
          module,
          { y: 60, opacity: 0, clipPath: 'inset(0 0 100% 0 round 24px)' },
          {
            y: 0,
            opacity: 1,
            clipPath: 'inset(0 0 0% 0 round 24px)',
            duration: 1,
            ease: 'power3.out',
            clearProps: 'transform,opacity,clipPath',
            scrollTrigger: { trigger: module, start: 'top 85%', once: true },
          }
        )
      })
    },
    [prefersReducedMotion],
    sectionRef
  )

  return (
    <section className="lab" id="section-lab" ref={sectionRef} aria-label="Laboratorio">
      <div className="lab__scan" aria-hidden="true" />
      <div className="lab__header">
        <SectionHeading number="LAB" label="Experimentos" />
        <KineticText className="lab__headline" text="Ideas que puedes tocar." accent={['tocar.']} />
        <p className="lab__intro">
          No son capturas: el código corre en tu navegador. Tres experimentos ligados a lo que investigo y construyo.
        </p>
      </div>

      <div className="lab__grid">
        <PathfindingExperiment />
        <NeuralExperiment />
        <ConvolutionExperiment />
      </div>
    </section>
  )
}
