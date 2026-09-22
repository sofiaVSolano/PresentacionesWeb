import type { SoftSkill } from '@/types/skill'

// `effect` define el patrón de luz en el cerebro de MI MENTE al seleccionar cada habilidad:
// pulse = la región late · waves = ondas que recorren todo el cerebro
// network = otras regiones se encienden por turnos
export const softSkills: SoftSkill[] = [
  {
    id: 'liderazgo',
    name: 'Liderazgo',
    short: 'Guiar equipos hacia una meta',
    description:
      'Lidero una célula del semillero de investigación PADIA y he liderado equipos en hackathones nacionales.',
    effect: 'waves',
  },
  {
    id: 'comunicacion-tecnica',
    name: 'Comunicación técnica',
    short: 'Explicar lo complejo con claridad',
    description:
      'Ponente en el IV Congreso Colombiano de Estadística presentando SAID, un sistema de alerta temprana para dengue.',
    effect: 'waves',
  },
  {
    id: 'capacidad-investigacion',
    name: 'Capacidad de investigación',
    short: 'Preguntas con rigor',
    description:
      'Primera autora en ColCACI 2025 y próxima publicación con IEEE (Amitic 2025) sobre planeación de rutas para robots móviles.',
    effect: 'pulse',
  },
  {
    id: 'aprendizaje-autonomo',
    name: 'Aprendizaje autónomo',
    short: 'Aprender construyendo',
    description: 'Self-directed learning: aprendo tecnologías nuevas construyendo con ellas.',
    effect: 'pulse',
  },
  {
    id: 'pensamiento-critico',
    name: 'Pensamiento crítico',
    short: 'Cuestionar antes de decidir',
    description: 'Análisis riguroso antes de tomar decisiones técnicas o de producto.',
    effect: 'pulse',
  },
  {
    id: 'resolucion-problemas',
    name: 'Resolución de problemas',
    short: 'Descomponer y resolver',
    description: 'Diseño y desarrollo de agentes inteligentes bajo presión de tiempo en hackathones.',
    effect: 'network',
  },
  {
    id: 'adaptabilidad',
    name: 'Adaptabilidad tecnológica',
    short: 'Cambiar de dominio sin miedo',
    description: 'Cambio de dominio según lo exige el proyecto: IA, web, datos, investigación.',
    effect: 'pulse',
  },
  {
    id: 'gestion-proyectos',
    name: 'Gestión de proyectos',
    short: 'Coordinar para entregar',
    description: 'Coordinación de proyectos y mentoría de estudiantes dentro de PADIA.',
    effect: 'waves',
  },
]
