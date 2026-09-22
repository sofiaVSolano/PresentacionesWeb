import type { CSSProperties } from 'react'
import type { Project } from '@/types/project'
import { hasValue, isLive, STATUS_LABEL } from './projectDisplay'

interface WorksPanelProps {
  project: Project
  color: string
  index: number
  total: number
  onClose: () => void
  onPrev: () => void
  onNext: () => void
}

const pad = (n: number) => String(n).padStart(2, '0')

export function WorksPanel({ project, color, index, total, onClose, onPrev, onNext }: WorksPanelProps) {
  const live = isLive(project)
  const blocks = [
    { title: 'El problema', text: project.problem },
    { title: 'La solución', text: project.solution },
  ].filter((b) => hasValue(b.text))
  const pending = !hasValue(project.description) && blocks.length === 0

  return (
    <aside
      className="works__panel"
      aria-labelledby="works-panel-title"
      aria-live="polite"
      style={{ '--planet': color } as CSSProperties}
    >
      <div className="works__panel-top">
        <span className="works__panel-index">
          Mundo {pad(index + 1)} / {pad(total)}
        </span>
        <button className="works__panel-close" onClick={onClose} aria-label="Cerrar proyecto" data-cursor="CLOSE">
          ×
        </button>
      </div>

      <div className="works__panel-content" key={project.id}>
        <div className="works__panel-badges">
          {live && (
            <span className="works__badge works__badge--live">
              <i aria-hidden="true" /> LIVE
            </span>
          )}
          <span className="works__badge">{STATUS_LABEL[project.status]}</span>
          {project.featured && <span className="works__badge">Destacado</span>}
        </div>

        <h3 className="works__panel-title" id="works-panel-title">
          {project.title}
        </h3>

        {hasValue(project.description) && <p className="works__panel-desc">{project.description}</p>}

        {blocks.map((block) => (
          <div className="works__panel-block" key={block.title}>
            <p className="works__panel-sub">{block.title}</p>
            <p>{block.text}</p>
          </div>
        ))}

        {hasValue(project.role) && (
          <div className="works__panel-block">
            <p className="works__panel-sub">Mi rol</p>
            <p>{project.role}</p>
          </div>
        )}

        {project.technologies.length > 0 && (
          <ul className="works__chips" aria-label="Tecnologías">
            {project.technologies.map((tech) => (
              <li key={tech}>{tech}</li>
            ))}
          </ul>
        )}

        {pending && (
          <p className="works__panel-pending">
            Este mundo todavía se está cartografiando: muy pronto su historia completa.
          </p>
        )}

        {(hasValue(project.demoUrl) || hasValue(project.githubUrl)) && (
          <div className="works__links">
            {hasValue(project.demoUrl) && (
              <a href={project.demoUrl} target="_blank" rel="noreferrer" className="works__link works__link--primary" data-cursor="VIEW →">
                {live ? `Visitar ${project.title} ↗` : 'Ver demo ↗'}
              </a>
            )}
            {hasValue(project.githubUrl) && (
              <a href={project.githubUrl} target="_blank" rel="noreferrer" className="works__link" data-cursor="VIEW →">
                GitHub ↗
              </a>
            )}
          </div>
        )}
      </div>

      <div className="works__panel-nav">
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
