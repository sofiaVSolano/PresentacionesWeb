import type { SkillCategory, SkillCategoryMeta, TechSkill } from '@/types/skill'

// Orden de las categorías = orden de los "genes" a lo largo de la hélice de MI ADN
export const skillCategories: Record<SkillCategory, SkillCategoryMeta> = {
  ai: { label: 'Inteligencia Artificial', color: '#d6708a' },
  frontend: { label: 'Frontend', color: '#f3e7dc' },
  backend: { label: 'Backend', color: '#b8303f' },
  // cian acero: se distingue del crema de Frontend y enlaza con los circuitos del video
  database: { label: 'Bases de datos', color: '#6fb6c9' },
  tools: { label: 'Herramientas', color: '#c9a27e' },
}

export const techSkills: TechSkill[] = [
  // Inteligencia Artificial
  {
    id: 'machine-learning',
    name: 'Machine Learning',
    category: 'ai',
    description: 'Modelos que aprenden patrones de los datos para predecir y clasificar.',
  },
  {
    id: 'deep-learning',
    name: 'Deep Learning',
    category: 'ai',
    description: 'Redes neuronales profundas para los problemas donde los modelos clásicos se quedan cortos.',
  },
  {
    id: 'computer-vision',
    name: 'Computer Vision',
    category: 'ai',
    description: 'Modelos que interpretan imágenes y video.',
  },
  {
    id: 'generative-ai',
    name: 'Generative AI',
    category: 'ai',
    description: 'Modelos que generan texto, imágenes o código: la base de los agentes inteligentes.',
  },
  {
    id: 'llms',
    name: 'LLMs',
    category: 'ai',
    description: 'Modelos de lenguaje para razonar, resumir y conversar sobre información.',
  },
  {
    id: 'prompt-engineering',
    name: 'Prompt Engineering',
    category: 'ai',
    description: 'Diseñar instrucciones precisas para obtener resultados fiables de un LLM.',
  },
  {
    id: 'tensorflow',
    name: 'TensorFlow / Keras',
    category: 'ai',
    description: 'Framework para entrenar y desplegar modelos de deep learning, con Keras como API de alto nivel.',
  },

  // Frontend
  {
    id: 'react',
    name: 'React',
    category: 'frontend',
    description: 'Biblioteca para construir interfaces por componentes: la base de este portafolio.',
  },
  {
    id: 'typescript',
    name: 'TypeScript',
    category: 'frontend',
    description: 'JavaScript con tipos: menos errores y código que se explica solo. Este sitio está escrito en TypeScript.',
  },
  {
    id: 'javascript',
    name: 'JavaScript',
    category: 'frontend',
    description: 'El lenguaje de la web, del navegador al servidor.',
  },
  {
    id: 'html',
    name: 'HTML',
    category: 'frontend',
    description: 'La estructura semántica y accesible de cada página.',
  },
  {
    id: 'css',
    name: 'CSS',
    category: 'frontend',
    description: 'Diseño, layout y animación de interfaces.',
  },
  {
    id: 'threejs',
    name: 'Three.js',
    category: 'frontend',
    description: '3D en el navegador con WebGL: esta misma hélice está hecha con Three.js.',
  },
  {
    id: 'gsap',
    name: 'GSAP',
    category: 'frontend',
    description: 'Animación de alto rendimiento: las transiciones de este sitio corren sobre GSAP.',
  },

  // Backend
  {
    id: 'python',
    name: 'Python',
    category: 'backend',
    description: 'Mi lenguaje principal: inteligencia artificial, análisis de datos y backend.',
  },
  {
    id: 'fastapi',
    name: 'FastAPI',
    category: 'backend',
    description: 'APIs rápidas en Python con validación y documentación automáticas. El backend de este sitio usa FastAPI.',
  },
  {
    id: 'flask',
    name: 'Flask',
    category: 'backend',
    description: 'Microframework de Python para APIs y aplicaciones web ligeras.',
  },
  {
    id: 'django',
    name: 'Django',
    category: 'backend',
    description: 'Framework completo de Python para aplicaciones web con base de datos.',
  },
  {
    id: 'java',
    name: 'Java',
    category: 'backend',
    description: 'Lenguaje orientado a objetos para aplicaciones robustas.',
  },
  {
    id: 'php',
    name: 'PHP',
    category: 'backend',
    description: 'Lenguaje del lado del servidor para aplicaciones web.',
  },
  {
    id: 'rest-apis',
    name: 'APIs REST',
    category: 'backend',
    description: 'APIs claras y predecibles para conectar interfaz, datos y modelos.',
  },

  // Bases de datos
  {
    id: 'postgresql',
    name: 'PostgreSQL',
    category: 'database',
    description: 'Base de datos relacional robusta, el estándar para producción.',
  },
  {
    id: 'mysql',
    name: 'MySQL',
    category: 'database',
    description: 'Base de datos relacional muy extendida en aplicaciones web.',
  },
  {
    id: 'mongodb',
    name: 'MongoDB',
    category: 'database',
    description: 'Base de datos NoSQL orientada a documentos.',
  },
  {
    id: 'sqlite',
    name: 'SQLite',
    category: 'database',
    description: 'Base de datos embebida, ideal para prototipos y aplicaciones ligeras.',
  },
  {
    id: 'sql',
    name: 'SQL',
    category: 'database',
    description: 'El lenguaje para consultar y modelar datos relacionales.',
  },
  {
    id: 'supabase',
    name: 'Supabase',
    category: 'database',
    description: 'Backend como servicio sobre PostgreSQL: autenticación, base de datos y APIs listas.',
  },
  {
    id: 'firestore',
    name: 'Firestore',
    category: 'database',
    description: 'Base de datos NoSQL en tiempo real de Firebase.',
  },

  // Herramientas
  {
    id: 'git',
    name: 'Git',
    category: 'tools',
    description: 'Control de versiones para trabajar en equipo sin perder nada.',
  },
  {
    id: 'docker',
    name: 'Docker',
    category: 'tools',
    description: 'Contenedores para que un proyecto corra igual en cualquier máquina. Este sitio se levanta con Docker Compose.',
  },
  {
    id: 'pandas',
    name: 'Pandas',
    category: 'tools',
    description: 'Manipulación y análisis de datos tabulares en Python.',
  },
  {
    id: 'numpy',
    name: 'NumPy',
    category: 'tools',
    description: 'Cómputo numérico eficiente: la base del ecosistema científico de Python.',
  },
  {
    id: 'scrum',
    name: 'Scrum',
    category: 'tools',
    description: 'Metodología ágil para entregar en ciclos cortos con feedback constante.',
  },
]
