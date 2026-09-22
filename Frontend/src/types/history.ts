import type { HistoryPhoto } from '@/data/historyPhotos'

export interface HistoryEntry {
  id: string
  /** Qué fue: el nombre del proyecto o del reto */
  title: string
  /** Dónde ocurrió */
  event: string
  /** Cómo terminó: el puesto, o el papel si no hubo podio */
  result: string
  /** Una línea más, solo si se sabe de verdad */
  detail?: string
  /** Con quién se consiguió. Solo nombres confirmados; vacío = pendiente de saber. */
  team?: string[]
  /** Clave en historyPhotos (lo genera scripts/prepare_photos.py). Sin foto, la tarjeta es tipográfica. */
  photo?: HistoryPhoto
  /**
   * `cover` llena la tarjeta (fotos), `contain` la muestra entera sin recortar
   * (diplomas y capturas: recortarlas las volvería ilegibles).
   */
  fit?: 'cover' | 'contain'
}
