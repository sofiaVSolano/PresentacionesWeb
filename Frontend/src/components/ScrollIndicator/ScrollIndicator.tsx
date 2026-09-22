import './ScrollIndicator.css'

interface ScrollIndicatorProps {
  label?: string
}

export function ScrollIndicator({ label = 'Desliza para entrar' }: ScrollIndicatorProps) {
  return (
    <div className="scroll-indicator" data-cursor="SCROLL">
      <span className="scroll-indicator__label">{label}</span>
      <div className="scroll-indicator__line">
        <div className="scroll-indicator__pulse" />
      </div>
    </div>
  )
}
