import './SectionHeading.css'

interface SectionHeadingProps {
  number: string
  label: string
}

export function SectionHeading({ number, label }: SectionHeadingProps) {
  return (
    <p className="section-heading">
      <span className="section-heading__number">{number}</span>
      <span className="section-heading__rule" aria-hidden="true" />
      <span>{label}</span>
    </p>
  )
}
