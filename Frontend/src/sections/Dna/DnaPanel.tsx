import type { CSSProperties } from 'react'
import { skillCategories } from '@/data/skills'
import type { TechSkill } from '@/types/skill'

interface DnaPanelProps {
  skill: TechSkill
  index: number
  total: number
  areas: string[]
  projects: string[]
  onClose: () => void
  onPrev: () => void
  onNext: () => void
}

const pad = (n: number) => String(n).padStart(2, '0')

/** Ficha "etiqueta de laboratorio" de una tecnología */
export function DnaPanel({ skill, index, total, areas, projects, onClose, onPrev, onNext }: DnaPanelProps) {
  const category = skillCategories[skill.category]

  return (
    <aside
      className="dna__panel"
      aria-labelledby="dna-panel-title"
      aria-live="polite"
      style={{ '--dna-color': category.color } as CSSProperties}
    >
      <div className="dna__panel-barcode" aria-hidden="true" />

      <div className="dna__panel-top">
        <span className="dna__panel-seq">
          Secuencia 03.{pad(index + 1)} / {pad(total)}
        </span>
        <button className="dna__panel-close" onClick={onClose} aria-label="Cerrar ficha" data-cursor="CLOSE">
          ×
        </button>
      </div>

      <div className="dna__panel-content" key={skill.id}>
        <span className="dna__panel-category">{category.label}</span>
        <h3 className="dna__panel-title" id="dna-panel-title">
          {skill.name}
        </h3>
        <p className="dna__panel-desc">{skill.description}</p>

        {areas.length > 0 && (
          <div className="dna__panel-block">
            <p className="dna__panel-sub">Dónde la aplico</p>
            <ul className="dna__panel-chips">
              {areas.map((area) => (
                <li key={area}>{area}</li>
              ))}
            </ul>
          </div>
        )}

        {projects.length > 0 && (
          <div className="dna__panel-block">
            <p className="dna__panel-sub">Proyectos</p>
            <ul className="dna__panel-chips">
              {projects.map((project) => (
                <li key={project}>{project}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="dna__panel-nav">
        <button onClick={onPrev} data-cursor="PREV">
          ← Anterior
        </button>
        <button onClick={onNext} data-cursor="NEXT">
          Siguiente →
        </button>
      </div>
    </aside>
  )
}
