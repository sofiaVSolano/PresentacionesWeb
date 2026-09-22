import type { MindItem } from '@/types/mind'

// Nodos de conocimiento de la sección 02 — MI MENTE.
// El orden importa: define la posición alrededor del núcleo (los de IA quedan juntos).
export const mindNodes: MindItem[] = [
  {
    id: 'ai',
    label: 'Inteligencia Artificial',
    short: 'Mi especialización',
    description:
      'Es mi especialización. Me interesa construir sistemas que aprenden de los datos para resolver problemas reales: desde los agentes inteligentes con los que ganamos la Hackathon Colombia 4.0 hasta la investigación que lidero en PADIA.',
    skills: ['machine-learning', 'deep-learning', 'generative-ai', 'llms', 'prompt-engineering'],
  },
  {
    id: 'ml',
    label: 'Machine Learning',
    short: 'Modelos que aprenden de datos',
    description:
      'Modelos predictivos y de clasificación con Python, TensorFlow/Keras, Pandas y NumPy. La base sobre la que construyo casi todo lo demás en IA.',
    skills: ['machine-learning', 'tensorflow', 'python', 'pandas', 'numpy'],
  },
  {
    id: 'cv',
    label: 'Computer Vision',
    short: 'Máquinas que ven',
    description:
      'Modelos de deep learning que interpretan imágenes. Un área que exploro con TensorFlow y Keras.',
    skills: ['computer-vision', 'deep-learning', 'tensorflow'],
  },
  {
    id: 'genai',
    label: 'Generative AI',
    short: 'Agentes y LLMs',
    description:
      'Agentes inteligentes, LLMs y prompt engineering. Diseñar agentes que resuelven retos reales fue el corazón de nuestras hackathones.',
    skills: ['generative-ai', 'llms', 'prompt-engineering'],
  },
  {
    id: 'software',
    label: 'Desarrollo de Software',
    short: 'Del prototipo al producto',
    description:
      'Del prototipo que nace en una hackathon a la aplicación que alguien termina usando. Python, Java, JavaScript y PHP, trabajando con Scrum.',
    skills: ['python', 'java', 'javascript', 'php', 'git', 'scrum'],
  },
  {
    id: 'frontend',
    label: 'Frontend',
    short: 'Interfaces que se sienten',
    description:
      'Interfaces con React, TypeScript, Three.js y GSAP. Este portafolio es la demostración.',
    skills: ['react', 'typescript', 'javascript', 'html', 'css', 'threejs', 'gsap'],
  },
  {
    id: 'backend',
    label: 'Backend',
    short: 'APIs y lógica',
    description:
      'APIs REST con FastAPI, Flask y Django: la lógica que conecta la interfaz con los datos y con los modelos.',
    skills: ['python', 'fastapi', 'flask', 'django', 'rest-apis'],
  },
  {
    id: 'databases',
    label: 'Bases de datos',
    short: 'Datos bien modelados',
    description:
      'Modelado y consultas en PostgreSQL, MySQL, MongoDB, SQLite, Supabase y Firestore.',
    skills: ['postgresql', 'mysql', 'mongodb', 'sqlite', 'sql', 'supabase', 'firestore'],
  },
]
