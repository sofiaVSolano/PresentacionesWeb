/**
 * Un campo "existe" si tiene contenido real: los marcadores [POR DEFINIR] que
 * quedan pendientes en los archivos de datos nunca llegan a la pantalla.
 */
export const hasValue = (value?: string) => Boolean(value && value.trim() && !value.includes('POR DEFINIR'))
