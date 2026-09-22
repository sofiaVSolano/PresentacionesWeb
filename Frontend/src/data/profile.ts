import type { Profile } from '@/types/profile'

export const profile: Profile = {
  fullName: 'Sofia Valencia Solano',
  shortName: 'Sofia',
  displayName: 'Sofia Valencia',
  heroSubtitle: 'Ingeniería de Sistemas · Inteligencia Artificial · Desarrollo de Software',
  tagline: 'Traduzco preguntas humanas en algoritmos que piensan.',
  role: 'Estudiante de Ingeniería de Sistemas · 8.º semestre',
  location: 'Cali, Colombia',
  bio: [
    'Soy estudiante de 8.º semestre de Ingeniería de Sistemas en la Universidad de San Buenaventura Cali y lidero una célula del semillero de investigación PADIA.',
    'Me interesa la intersección entre inteligencia artificial y desarrollo de software: entender un problema real antes de escribir la primera línea de código, y construir soluciones que de verdad se usen.',
    'He liderado equipos en hackathones nacionales, presentado investigación en congresos académicos y coordinado proyectos de analítica de datos e IA dentro de PADIA. Trabajo con una mentalidad colaborativa, analítica y curiosa: aprendo construyendo.',
  ],
  languages: [
    { name: 'Español', level: 'Nativo' },
    { name: 'Inglés', level: 'C1' },
  ],
  pillars: [
    {
      label: 'Inteligencia Artificial',
      detail: 'Machine learning, deep learning y visión por computador aplicados a problemas reales.',
    },
    {
      label: 'Desarrollo de Software',
      detail: 'Del prototipo en una hackathon a la aplicación que alguien termina usando.',
    },
    {
      label: 'Investigación',
      detail: 'Publicaciones en ColCACI e IEEE, y ponencias en congresos, desde el semillero PADIA.',
    },
  ],
  education: {
    degree: 'Ingeniería de Sistemas',
    institution: 'Universidad de San Buenaventura Cali',
    detail: '8.º semestre · graduación estimada 2027',
  },
  // El semillero vive en data/padia.ts, junto a la etiqueta que lo muestra
  // Salen de achievements.ts: 1er lugar en Colombia 4.0 Cali, Colombia 5.0 Cali, Hackathon de
  // Mujeres y OdiseIA4Good (modalidad online); podios = esos 4 + dos 2dos lugares en Bogotá
  // + 3er lugar LegalTech; artículos = ColCACI + IEEE.
  stats: [
    { value: 4, label: 'Hackathones ganadas' },
    { value: 7, label: 'Podios en hackathones' },
    { value: 2, label: 'Artículos de investigación' },
    { value: 8, suffix: '.º', label: 'Semestre de Ingeniería' },
  ],
  highlights: [
    'Lidero equipos en hackathones nacionales.',
    'Presento investigación en congresos académicos.',
    'Coordino proyectos de analítica de datos e IA dentro de PADIA.',
    'Trabajo con una mentalidad colaborativa, analítica y curiosa: aprendo construyendo.',
  ],
}
