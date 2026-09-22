import type { ReactNode } from 'react'

interface LabModuleProps {
  code: string
  title: string
  context: ReactNode
  running: boolean
  wide?: boolean
  children: ReactNode
}

/** Ventana-módulo del laboratorio: cabecera con código, luz de estado y contexto */
export function LabModule({ code, title, context, running, wide, children }: LabModuleProps) {
  return (
    <article className={`lab__module${wide ? ' lab__module--wide' : ''}`} data-running={running}>
      <header className="lab__module-bar">
        <span className="lab__led" aria-hidden="true" />
        <span className="lab__code">{code}</span>
        <h3 className="lab__module-title">{title}</h3>
        <span className="lab__status" aria-hidden="true">
          {running ? 'Ejecutando' : 'En espera'}
        </span>
      </header>
      <p className="lab__context">{context}</p>
      {children}
    </article>
  )
}
