/**
 * Envío del formulario de contacto al backend.
 *
 * La URL sale de VITE_API_URL (ver .env.example). Si no está definida se usa el
 * mismo origen, que es lo que ocurre cuando front y back van tras el mismo proxy.
 */
const API_URL = import.meta.env.VITE_API_URL ?? ''

export interface ContactPayload {
  name: string
  email: string
  message: string
}

export interface ContactResult {
  success: boolean
  detail: string
}

export async function sendContact(
  payload: ContactPayload,
  signal?: AbortSignal
): Promise<ContactResult> {
  let response: Response
  try {
    response = await fetch(`${API_URL}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal,
    })
  } catch (error) {
    // `fetch` solo lanza por fallo de red: el mensaje del navegador va en inglés
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new Error('No se pudo conectar con el servidor.', { cause: error })
  }

  if (!response.ok) {
    // 422 = el backend rechazó los datos (su `detail` es una lista técnica, no
    // sirve para enseñar). En el resto de casos el backend manda un texto ya
    // escrito para leerse —"inténtalo en un rato", "escríbeme directo"— y ese
    // dice bastante más que un "algo salió mal" genérico.
    let detail =
      response.status === 422 ? 'Revisa los datos del formulario.' : 'El servidor no pudo enviarlo.'
    if (response.status !== 422) {
      try {
        const body = (await response.json()) as { detail?: unknown }
        if (typeof body.detail === 'string' && body.detail.trim()) detail = body.detail
      } catch {
        // respuesta sin JSON: se queda el texto de arriba
      }
    }
    throw new Error(detail)
  }

  return (await response.json()) as ContactResult
}
