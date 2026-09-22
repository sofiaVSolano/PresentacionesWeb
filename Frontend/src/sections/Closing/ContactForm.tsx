import { useEffect, useRef, useState } from 'react'
import { useSound } from '@/audio/soundContext'
import { playBlip } from '@/audio/soundEngine'
import { sendContact } from '@/services/contact'
import { contactCopy } from '@/data/closing'
import type { ContactState } from '@/types/closing'

const MAX_MESSAGE = 2000 // el backend rechaza por encima de esto

/**
 * Formulario de contacto. Si el backend no está levantado no se pierde el
 * mensaje: se ofrece el correo directo con lo escrito ya dentro.
 */
export function ContactForm() {
  const [state, setState] = useState<ContactState>('idle')
  const [error, setError] = useState('')
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const abortRef = useRef<AbortController | null>(null)
  const { enabled: soundEnabled } = useSound()

  useEffect(() => () => abortRef.current?.abort(), [])

  const update = (field: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [field]: event.target.value }))

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (state === 'sending') return

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setState('sending')
    setError('')
    try {
      await sendContact(form, controller.signal)
      setState('sent')
      setForm({ name: '', email: '', message: '' })
      if (soundEnabled) playBlip()
    } catch (err) {
      if (controller.signal.aborted) return
      setState('error')
      setError(err instanceof Error ? err.message : 'No se pudo enviar.')
    }
  }

  // Enlace de respaldo: abre el correo con el mensaje ya escrito
  const mailto = `mailto:${contactCopy.fallbackEmail}?subject=${encodeURIComponent(
    `Contacto desde el portafolio — ${form.name || 'sin nombre'}`
  )}&body=${encodeURIComponent(form.message)}`

  if (state === 'sent') {
    return (
      <div className="contact__done" role="status">
        <p className="contact__done-title">Mensaje enviado</p>
        <p className="contact__done-text">Gracias por escribir. Te respondo pronto.</p>
        <button type="button" className="contact__again" onClick={() => setState('idle')} data-cursor="OTRO">
          Escribir otro
        </button>
      </div>
    )
  }

  return (
    <form className="contact__form" onSubmit={onSubmit} noValidate={false}>
      <label className="contact__field">
        <span>Tu nombre</span>
        <input
          type="text"
          name="name"
          required
          maxLength={120}
          autoComplete="name"
          value={form.name}
          onChange={update('name')}
        />
      </label>

      <label className="contact__field">
        <span>Tu correo</span>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          value={form.email}
          onChange={update('email')}
        />
      </label>

      <label className="contact__field contact__field--wide">
        <span>
          Tu mensaje
          <small>
            {form.message.length} / {MAX_MESSAGE}
          </small>
        </span>
        <textarea
          name="message"
          required
          rows={5}
          maxLength={MAX_MESSAGE}
          value={form.message}
          onChange={update('message')}
        />
      </label>

      {state === 'error' && (
        <p className="contact__error" role="alert">
          {error} Puedes{' '}
          <a href={mailto} data-cursor="CORREO">
            escribirme directo
          </a>
          .
        </p>
      )}

      <button type="submit" className="contact__send" disabled={state === 'sending'} data-cursor="ENVIAR">
        {state === 'sending' ? 'Enviando…' : 'Enviar mensaje'}
      </button>
    </form>
  )
}
