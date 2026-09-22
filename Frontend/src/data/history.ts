import type { HistoryEntry } from '@/types/history'

/**
 * Sección 05 — MI HISTORIA.
 *
 * El orden lo dio Sofía, de lo más antiguo a lo más reciente. Las fechas exactas
 * no se saben, así que la sección NO las muestra: se ordena por secuencia. El
 * componente respeta el orden de este array; no reordena por nada.
 *
 * `detail` solo se rellena cuando el dato está confirmado. Vacío = pendiente.
 */
export const history: HistoryEntry[] = [
  {
    id: 'said-congreso',
    title: 'SAID',
    event: 'IV Congreso Colombiano de Estadística',
    result: 'Ponencia',
    detail: 'Un sistema inteligente de alerta temprana para analizar el dengue.',
    // Los nombres salen de la propia diapositiva de la foto
    team: ['Sofia Moreno', 'Juan David Díaz'],
    photo: 'CongresoColombiano',
    fit: 'cover',
  },
  {
    id: 'legal-hackers',
    title: 'Hackathon de Innovación Legal',
    event: 'Legal Hackers · Bogotá Global Summit 2025',
    result: 'Tercer puesto',
    photo: 'legalHackers',
    fit: 'contain',
  },
  {
    id: 'odiseia4good',
    title: 'Hackathon OdiseIA4Good 2026',
    event: 'Modalidad online',
    result: 'Primer puesto',
    photo: 'OdiseIA4Good',
    fit: 'contain',
  },
  {
    id: 'colombia-40-cali',
    title: 'Hackathon Colombia 4.0',
    event: 'Cali',
    result: 'Primer puesto',
    photo: 'Colombia4.0Cali',
    fit: 'cover',
  },
  {
    id: 'colombia-50-cali',
    title: 'Hackathon Colombia 5.0',
    event: 'Cali',
    result: 'Primer puesto',
    photo: 'Colombia5.0Cali',
    fit: 'cover',
  },
  {
    id: 'colombia-50-bogota',
    title: 'Hackathon Colombia 5.0',
    event: 'Bogotá',
    result: 'Segundo puesto',
    photo: 'Colombia5.0Bogota',
    fit: 'cover',
  },
]
