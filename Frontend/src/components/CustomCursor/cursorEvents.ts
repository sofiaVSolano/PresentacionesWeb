export const CURSOR_LABEL_EVENT = 'cursor-label'

/**
 * Cambia la etiqueta del cursor sin un elemento del DOM debajo — p. ej. al pasar
 * sobre un objeto dentro de un canvas 3D. `null` la oculta.
 */
export function setCursorLabel(label: string | null) {
  window.dispatchEvent(new CustomEvent<string | null>(CURSOR_LABEL_EVENT, { detail: label }))
}
