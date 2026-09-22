import { useEffect, useRef, useState } from 'react'
import { useLenis } from 'lenis/react'
import { gsap } from '@/animations/gsap'
import { useGsapContext } from '@/hooks/useGsapContext'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { useIsTouchDevice } from '@/hooks/useIsTouchDevice'
import { useSound } from '@/audio/soundContext'
import { KineticText } from '@/components/KineticText/KineticText'
import { Marquee } from '@/components/Marquee/Marquee'
import { ParticleField } from '@/components/ParticleField/ParticleField'
import { profile } from '@/data/profile'
import { socials } from '@/data/socials'
import { footer } from '@/data/footer'
import './Footer.css'

const GRACIAS = ['Gracias', '✷', 'Thank you', '✷', 'Obrigada', '✷', 'Merci', '✷']
const CREDITOS = [
  'Fin del recorrido',
  '✦',
  'Hecho en Cali',
  '✦',
  'Un sitio, no una plantilla',
  '✦',
  'Nos vemos pronto',
  '✦',
]

/** Lo que se enseña a la derecha de cada red: el usuario, no la URL entera */
function handleOf(url: string) {
  if (url.startsWith('mailto:')) return url.slice(7)
  const path = url.replace(/^https?:\/\/(www\.)?[^/]+\//, '').replace(/\/$/, '')
  const parts = path.split('/')
  return parts[0] === 'in' ? `in/${parts[1] ?? ''}` : `@${parts[0]}`
}

/** Hora de Cali, para que el saludo del pie sea de una persona y no de un servidor */
function localTime() {
  return new Intl.DateTimeFormat('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Bogota',
  }).format(new Date())
}

export function Footer() {
  const sectionRef = useRef<HTMLElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  /** El video corre de verdad: solo para apartar la música */
  const [playing, setPlaying] = useState(false)
  /** Desde el primer play hasta que acaba: mientras, mandan los controles */
  const [watching, setWatching] = useState(false)
  const [time, setTime] = useState(localTime)
  const prefersReducedMotion = usePrefersReducedMotion()
  const isTouch = useIsTouchDevice()
  const { duckMusic } = useSound()
  const lenis = useLenis()

  // Mientras habla, la música se aparta para que se le entienda
  useEffect(() => {
    duckMusic(playing)
    return () => duckMusic(false)
  }, [playing, duckMusic])

  // El reloj de la chapa: medio minuto de resolución es de sobra
  useEffect(() => {
    const id = window.setInterval(() => setTime(localTime()), 30_000)
    return () => window.clearInterval(id)
  }, [])

  // Un foco de teatro que sigue al puntero por todo el pie
  useEffect(() => {
    const el = sectionRef.current
    if (!el || isTouch || prefersReducedMotion) return
    let raf = 0
    let x = 50
    let y = 30
    const apply = () => {
      raf = 0
      el.style.setProperty('--footer-fx', `${x}%`)
      el.style.setProperty('--footer-fy', `${y}%`)
    }
    const onMove = (event: PointerEvent) => {
      const rect = el.getBoundingClientRect()
      x = ((event.clientX - rect.left) / rect.width) * 100
      y = ((event.clientY - rect.top) / rect.height) * 100
      if (!raf) raf = requestAnimationFrame(apply)
    }
    el.addEventListener('pointermove', onMove)
    return () => {
      el.removeEventListener('pointermove', onMove)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [isTouch, prefersReducedMotion])

  useGsapContext(
    () => {
      if (prefersReducedMotion) return

      gsap.utils.toArray<HTMLElement>('[data-rise]').forEach((el) => {
        gsap.fromTo(
          el,
          { y: 36, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.8,
            ease: 'power3.out',
            clearProps: 'transform,opacity',
            scrollTrigger: { trigger: el, start: 'top 90%', once: true },
          }
        )
      })

      // La firma se enciende en los últimos píxeles de la página. El recorrido
      // se mide contra el final del documento, no contra la propia palabra: así
      // el nombre termina siempre completo, y no a medias por quedarse sin scroll.
      gsap.fromTo(
        '.footer__wordmark-fill',
        { clipPath: 'inset(0 100% 0 0)' },
        {
          clipPath: 'inset(0 0% 0 0)',
          ease: 'none',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'bottom bottom+=320',
            end: 'bottom bottom+=8',
            scrub: 0.6,
          },
        }
      )
    },
    [prefersReducedMotion],
    sectionRef
  )

  const play = () => {
    const video = videoRef.current
    if (!video) return
    video
      .play()
      .then(() => {
        setPlaying(true)
        setWatching(true)
      })
      .catch(() => {})
  }

  return (
    <footer className="footer" ref={sectionRef} data-playing={playing}>
      <div className="footer__aurora" aria-hidden="true">
        <span className="footer__blob footer__blob--a" />
        <span className="footer__blob footer__blob--b" />
        <span className="footer__blob footer__blob--c" />
      </div>
      <div className="footer__spotlight" aria-hidden="true" />
      <div className="footer__grain" aria-hidden="true" />
      <ParticleField count={18} />

      <div className="footer__inner">
        <div className="footer__head" data-rise>
          <p className="text-kicker footer__kicker">
            <span className="footer__kicker-rule" aria-hidden="true" />
            Fin del recorrido
            <span className="footer__kicker-rule" aria-hidden="true" />
          </p>
          <KineticText
            className="footer__headline"
            as="h2"
            text="Llegaste hasta el final. Eso ya dice algo."
            accent={['algo.']}
          />
          <p className="footer__status">
            <span className="footer__status-dot" aria-hidden="true" />
            {footer.status}
            <span className="footer__status-sep" aria-hidden="true">
              ·
            </span>
            {profile.location}, {time}
          </p>
        </div>

        {/* El mensaje: a la izquierda su voz escrita, a la derecha su cara */}
        <div className="footer__message" data-rise>
          <div className="footer__stage">
            <span className="footer__stage-halo" aria-hidden="true" />

            <div className="footer__scene">
              <div className="footer__aside">
                <span className="footer__aside-mark" aria-hidden="true">
                  ✷
                </span>
                <p className="footer__aside-kicker">{footer.aside.kicker}</p>
                <KineticText
                  className="footer__aside-quote"
                  as="p"
                  text={footer.aside.quote}
                  accent={footer.aside.accent}
                />
                <span className="footer__aside-rule" aria-hidden="true" />
                <p className="footer__aside-meta">
                  {footer.label} · {footer.duration}
                </p>
                <p className="footer__aside-meta footer__aside-meta--soft">{footer.aside.meta}</p>
              </div>

              <div className="footer__panel">
                <video
                  ref={videoRef}
                  src={footer.video}
                  poster={footer.poster}
                  preload="none"
                  playsInline
                  controls={watching}
                  onEnded={() => {
                    setPlaying(false)
                    setWatching(false)
                  }}
                  onPause={() => setPlaying(false)}
                  onPlay={() => {
                    setPlaying(true)
                    setWatching(true)
                  }}
                />

                {!watching && (
                  <button
                    type="button"
                    className="footer__play"
                    onClick={play}
                    data-cursor="REPRODUCIR"
                  >
                    <span className="footer__play-disc" aria-hidden="true">
                      <span className="footer__play-ripple" />
                      <span className="footer__play-ripple footer__play-ripple--late" />
                      <svg viewBox="0 0 24 24">
                        <path d="M8 5.5v13l11-6.5-11-6.5Z" fill="currentColor" />
                      </svg>
                    </span>
                    <span className="footer__play-label">Un mensaje mío · {footer.duration}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
          <p className="footer__message-note">{footer.note}</p>
        </div>
      </div>

      {/* Dos cintas cruzadas: el telón de los agradecimientos */}
      <div className="footer__bands" aria-hidden="true">
        <Marquee className="footer__band footer__band--lead" items={GRACIAS} duration={28} />
        <Marquee
          className="footer__band footer__band--sub"
          items={CREDITOS}
          duration={38}
          reverse
        />
      </div>

      <div className="footer__inner footer__bottom">
        <ul className="footer__links" data-rise>
          {socials.map((social, index) => (
            <li key={social.id}>
              <a
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                data-cursor={social.label.toUpperCase()}
              >
                <span className="footer__link-index">{String(index + 1).padStart(2, '0')}</span>
                <span className="footer__link-label">{social.label}</span>
                <span className="footer__link-handle">{handleOf(social.url)}</span>
                <svg className="footer__link-arrow" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M7 17 17 7M9 7h8v8"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </a>
            </li>
          ))}
        </ul>

        <div className="footer__sign" data-rise>
          <div className="footer__signature">
            <p className="footer__name">{profile.fullName}</p>
          </div>

          <button
            type="button"
            className="footer__top"
            onClick={() => lenis?.scrollTo(0, { duration: 1.6 })}
            data-cursor="ARRIBA"
            aria-label="Volver arriba"
          >
            <svg className="footer__top-ring" viewBox="0 0 120 120" aria-hidden="true">
              <defs>
                <path id="footer-top-ring" d="M60,60 m-44,0 a44,44 0 1,1 88,0 a44,44 0 1,1 -88,0" />
              </defs>
              <text>
                <textPath href="#footer-top-ring" startOffset="0">
                  VOLVER ARRIBA · EMPEZAR DE NUEVO ·
                </textPath>
              </text>
            </svg>
            <svg className="footer__top-arrow" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M12 19V5M5 12l7-7 7 7"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* La firma a tamaño cartel: se rellena al llegar al borde de la página */}
      <div className="footer__wordmark" aria-hidden="true">
        <span className="footer__wordmark-base">{profile.displayName}</span>
        <span className="footer__wordmark-fill">{profile.displayName}</span>
      </div>

      <p className="footer__legal">
        © {new Date().getFullYear()} {profile.fullName}. {footer.rights}
      </p>
    </footer>
  )
}
