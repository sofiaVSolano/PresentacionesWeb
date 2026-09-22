import { techSkills } from '@/data/skills'
import type { MindItem } from '@/types/mind'

interface MindPanelProps {
  item: MindItem
  side: 'left' | 'right'
  index: number
  total: number
  onClose: () => void
  onPrev: () => void
  onNext: () => void
}

const pad = (n: number) => String(n).padStart(2, '0')

export function MindPanel({ item, side, index, total, onClose, onPrev, onNext }: MindPanelProps) {
  const chips = (item.skills ?? [])
    .map((id) => techSkills.find((s) => s.id === id)?.name)
    .filter((name): name is string => Boolean(name))

  return (
    <aside className="mind__panel" data-side={side} aria-labelledby="mind-panel-title" aria-live="polite">
      <div className="mind__panel-top">
        <span className="mind__panel-index">
          {side === 'left' ? 'Hemisferio izquierdo · Lo técnico' : 'Hemisferio derecho · Lo humano'} ·{' '}
          {pad(index + 1)}/{pad(total)}
        </span>
        <button className="mind__panel-close" onClick={onClose} aria-label="Cerrar detalle" data-cursor="CLOSE">
          ×
        </button>
      </div>

      <div className="mind__panel-content" key={item.id}>
        <img className="mind__panel-avatar" src="/assets/character/sofia-avatar-cutout.png" alt="" loading="lazy" />
        <div>
          <h3 className="mind__panel-title" id="mind-panel-title">
            {item.label}
          </h3>
          <p className="mind__panel-desc">{item.description}</p>
          {chips.length > 0 && (
            <ul className="mind__panel-chips" aria-label="Tecnologías relacionadas">
              {chips.map((chip) => (
                <li key={chip}>{chip}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mind__panel-nav">
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
