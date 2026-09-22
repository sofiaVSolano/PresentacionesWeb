/**
 * Cierre del sitio. El video es un mensaje hablado de Sofía, así que se
 * reproduce con sonido y con controles: nunca arranca solo.
 */
export const footer = {
  video: '/assets/video/mensaje-final.mp4',
  poster: '/assets/video/mensaje-final-poster.webp',
  duration: '19 s',
  /** Rótulo del marco del video, como el letrero de una sala */
  label: 'Mensaje final',
  /** El texto que acompaña al video. Es tu voz: cámbialo cuando quieras. */
  aside: {
    kicker: 'Cara a cara',
    quote: 'La persona detrás de todo esto.',
    /** Palabras de la frase que van en acento */
    accent: ['persona'],
    meta: 'Sin filtros, de una sola toma.',
  },
  note: 'Con sonido. Si prefieres leerlo, escríbeme y te cuento lo mismo por correo.',
  /** Lo que se anuncia en la chapa del pie. Cambiar cuando cambie la situación. */
  status: 'Abierta a prácticas, proyectos y colaboraciones',
  rights: 'Todos los derechos reservados.',
}
