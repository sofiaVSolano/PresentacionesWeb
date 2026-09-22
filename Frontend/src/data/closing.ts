import type { Reason } from '@/types/closing'

/**
 * Sección 06 — ¿POR QUÉ YO? · CV · CONTACTO.
 *
 * Cada motivo va con el hecho que lo respalda: nada aquí es una promesa suelta.
 * Todos salen de datos que ya están en el sitio (achievements.ts, history.ts,
 * skills.ts, profile.ts). Si un hecho cambia allí, hay que cambiarlo aquí.
 */
export const reasons: Reason[] = [
  {
    id: 'hackathons',
    symbol: 'trophy',
    title: 'Compito y gano',
    proof: '4 hackathones ganadas y 7 podios, entre Cali, Bogotá y una edición online.',
  },
  {
    id: 'research',
    symbol: 'research',
    title: 'Investigo, no solo programo',
    proof: 'Primera autora en ColCACI 2025 y publicación con IEEE (Amitic 2025).',
  },
  {
    id: 'lead',
    symbol: 'lead',
    title: 'Lidero equipos',
    proof: 'Líder de la Célula 2 del semillero PADIA y de equipos en hackathones nacionales.',
  },
  {
    id: 'ai',
    symbol: 'ai',
    title: 'La IA es mi especialidad',
    proof: 'Machine learning, deep learning y visión por computador aplicados a problemas reales.',
  },
  {
    id: 'ship',
    symbol: 'code',
    title: 'Termino lo que empiezo',
    proof: 'Del prototipo de una hackathon a la aplicación que alguien termina usando.',
  },
  {
    id: 'pressure',
    symbol: 'spark',
    title: 'Funciono bajo presión',
    proof: 'Agentes inteligentes diseñados y entregados con el reloj en contra.',
  },
  {
    id: 'speak',
    symbol: 'research',
    title: 'Explico lo complejo',
    proof: 'Ponente en el IV Congreso Colombiano de Estadística, presentando SAID.',
  },
  {
    id: 'learn',
    symbol: 'ai',
    title: 'Aprendo construyendo',
    proof: 'Este sitio es la prueba: React, TypeScript, Three.js y GSAP, aprendidos haciéndolo.',
  },
]

/** El documento. Basta con reemplazar el PDF en public/assets/cv/ y ajustar la fecha. */
export const cv = {
  file: '/assets/cv/Sofia_Valencia_CV.pdf',
  fileName: 'Sofia_Valencia_CV.pdf',
  /** Cuándo se actualizó por última vez el PDF */
  updated: '[POR DEFINIR]',
}

export const contactCopy = {
  title: 'Hablemos',
  text: '¿Tienes un proyecto, una idea o una oportunidad en mente? Me encantará escucharte.',
  /** A dónde escribir si el formulario falla o prefieres tu propio correo */
  fallbackEmail: 'ing.sofiavalenciasolano@gmail.com',
}
