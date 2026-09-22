import { useSound } from '@/audio/soundContext'
import './SoundToggle.css'

/**
 * Control de audio discreto: música y efectos por separado, porque no siempre
 * se quieren las dos cosas. Ambos empiezan apagados.
 */
export function SoundToggle() {
  const { music, effects, toggleMusic, toggleEffects } = useSound()

  return (
    <div className="sound-toggle" role="group" aria-label="Sonido">
      <button
        type="button"
        className="sound-toggle__btn"
        data-on={music}
        data-cursor={music ? 'QUITAR MÚSICA' : 'PONER MÚSICA'}
        aria-pressed={music}
        aria-label={music ? 'Quitar la música de fondo' : 'Poner música de fondo'}
        onClick={toggleMusic}
      >
        <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
          <path
            d="M6 12V3.9l6-1.3V10"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle className="sound-toggle__note" cx="4.3" cy="12" r="1.75" fill="currentColor" />
          <circle className="sound-toggle__note" cx="10.3" cy="10" r="1.75" fill="currentColor" />
        </svg>
      </button>

      <button
        type="button"
        className="sound-toggle__btn"
        data-on={effects}
        data-cursor={effects ? 'QUITAR EFECTOS' : 'PONER EFECTOS'}
        aria-pressed={effects}
        aria-label={effects ? 'Quitar los efectos de sonido' : 'Poner efectos de sonido'}
        onClick={toggleEffects}
      >
        <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
          <path d="M3.4 6.1h2L8.6 3.3v9.4L5.4 9.9h-2a.9.9 0 0 1-.9-.9V7a.9.9 0 0 1 .9-.9Z" fill="currentColor" />
          <path
            className="sound-toggle__wave"
            d="M11 6.2a2.8 2.8 0 0 1 0 3.6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
          <path
            className="sound-toggle__wave"
            d="M12.9 4.5a5.2 5.2 0 0 1 0 7"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
          <path
            className="sound-toggle__slash"
            d="M11.2 6.3 14.3 9.7"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  )
}
