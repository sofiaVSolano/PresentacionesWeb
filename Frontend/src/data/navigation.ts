export interface NavSection {
  id: string
  number: string
  label: string
}

export const navSections: NavSection[] = [
  { id: 'section-yo', number: '01', label: 'Yo' },
  { id: 'section-mente', number: '02', label: 'Mi Mente' },
  { id: 'section-adn', number: '03', label: 'Mi ADN' },
  { id: 'section-creaciones', number: '04', label: 'Creaciones' },
  // PADIA no es sección propia: vive como etiqueta dentro de 01 — Yo
  { id: 'section-historia', number: '05', label: 'Mi Historia' },
  // Los tres últimos son un solo bloque en pantalla, pero se saltan por separado
  { id: 'section-porque-yo', number: '06', label: '¿Por qué yo?' },
  { id: 'section-cv', number: '07', label: 'CV' },
  { id: 'section-contacto', number: '08', label: 'Contacto' },
]

export const navSectionIds = navSections.map((s) => s.id)
