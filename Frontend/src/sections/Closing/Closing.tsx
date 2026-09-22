import { useRef, useState } from 'react'
import { gsap } from '@/animations/gsap'
import { useGsapContext } from '@/hooks/useGsapContext'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { KineticText } from '@/components/KineticText/KineticText'
import { SectionHeading } from '@/components/SectionHeading/SectionHeading'
import { profile } from '@/data/profile'
import { socials } from '@/data/socials'
import { cv, contactCopy } from '@/data/closing'
import { hasValue } from '@/data/hasValue'
import { SlotMachine } from './SlotMachine'
import { ContactForm } from './ContactForm'
import './Closing.css'

const SOCIAL_ART: Record<string, string> = {
  github:
    'M12 1.5a10.5 10.5 0 0 0-3.3 20.5c.5.1.7-.2.7-.5v-2c-2.9.6-3.5-1.3-3.5-1.3-.5-1.2-1.2-1.6-1.2-1.6-1-.6 0-.6 0-.6 1 .1 1.6 1.1 1.6 1.1.9 1.6 2.4 1.1 3 .9.1-.7.4-1.1.7-1.4-2.3-.3-4.8-1.2-4.8-5.2 0-1.2.4-2.1 1.1-2.9-.1-.3-.5-1.3.1-2.8 0 0 .9-.3 2.9 1.1a10 10 0 0 1 5.2 0c2-1.4 2.9-1.1 2.9-1.1.6 1.5.2 2.5.1 2.8.7.8 1.1 1.7 1.1 2.9 0 4-2.5 4.9-4.8 5.2.4.3.7.9.7 1.9v2.8c0 .3.2.6.7.5A10.5 10.5 0 0 0 12 1.5Z',
  linkedin:
    'M4.5 3a1.9 1.9 0 1 0 0 3.8 1.9 1.9 0 0 0 0-3.8ZM2.9 8.6h3.2V21H2.9V8.6Zm6 0h3v1.7c.5-.9 1.6-1.9 3.4-1.9 3.1 0 3.8 2 3.8 4.7V21h-3.2v-6.4c0-1.5 0-3.5-2.1-3.5s-2.4 1.7-2.4 3.4V21H8.9V8.6Z',
  email: 'M2.5 5.5h19v13h-19v-13Zm0 0L12 13l9.5-7.5',
}

export function Closing() {
  const sectionRef = useRef<HTMLElement>(null)
  const [unlocked, setUnlocked] = useState(false)
  const prefersReducedMotion = usePrefersReducedMotion()

  useGsapContext(
    () => {
      if (prefersReducedMotion) return
      gsap.utils.toArray<HTMLElement>('[data-rise]').forEach((el) => {
        gsap.fromTo(
          el,
          { y: 44, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.8,
            ease: 'power3.out',
            clearProps: 'transform,opacity',
            scrollTrigger: { trigger: el, start: 'top 88%', once: true },
          }
        )
      })
    },
    [prefersReducedMotion],
    sectionRef
  )

  return (
    <section className="closing" ref={sectionRef} aria-label="Por qué yo, CV y contacto">
      {/* ---- Acto 1 · ¿Por qué yo? ---- */}
      <div className="closing__act closing__act--why" id="section-porque-yo">
        <div className="closing__head" data-rise>
          <SectionHeading number="06" label="¿Por qué yo?" />
          <KineticText
            className="closing__headline"
            text="No te voy a pedir que confíes. Te voy a dar los motivos."
            accent={['motivos.']}
          />
        </div>

        <div data-rise>
          <SlotMachine onComplete={() => setUnlocked(true)} />
        </div>
      </div>

      {/* ---- Acto 2 · El CV ---- */}
      <div className="closing__act closing__act--cv" id="section-cv" data-unlocked={unlocked}>
        <div className="closing__cv" data-rise>
          <div className="closing__cv-text">
            <p className="closing__kicker">07 · El papel</p>
            <h2 className="closing__cv-title">Todo eso, en una hoja</h2>
            <p className="closing__cv-lead">
              {profile.role} · {profile.location}. {profile.education.institution}.
            </p>

            <dl className="closing__cv-facts">
              <div>
                <dt>Formación</dt>
                <dd>
                  {profile.education.degree} · {profile.education.detail}
                </dd>
              </div>
              <div>
                <dt>Foco</dt>
                <dd>{profile.pillars.map((p) => p.label).join(' · ')}</dd>
              </div>
              <div>
                <dt>Idiomas</dt>
                <dd>{profile.languages.map((l) => `${l.name} (${l.level})`).join(' · ')}</dd>
              </div>
              {hasValue(cv.updated) && (
                <div>
                  <dt>Actualizado</dt>
                  <dd>{cv.updated}</dd>
                </div>
              )}
            </dl>

            <div className="closing__cv-actions">
              <a
                className="closing__cv-download"
                href={cv.file}
                download={cv.fileName}
                data-cursor="DESCARGAR"
              >
                Descargar CV (PDF)
              </a>
              <a
                className="closing__cv-open"
                href={cv.file}
                target="_blank"
                rel="noopener noreferrer"
                data-cursor="ABRIR"
              >
                Abrir en el navegador
              </a>
            </div>
          </div>

          {/* La hoja: un documento insinuado, no una captura */}
          <div className="closing__sheet" aria-hidden="true">
            <span className="closing__sheet-name">{profile.fullName}</span>
            <span className="closing__sheet-role">{profile.role}</span>
            <span className="closing__sheet-rule" />
            {Array.from({ length: 7 }).map((_, i) => (
              <span className="closing__sheet-line" key={i} />
            ))}
            <span className="closing__sheet-tag">PDF</span>
          </div>
        </div>
      </div>

      {/* ---- Acto 3 · Contacto ---- */}
      <div className="closing__act closing__act--contact" id="section-contacto">
        <div className="closing__contact" data-rise>
          <div className="closing__contact-text">
            <p className="closing__kicker">08 · La puerta</p>
            <h2 className="closing__contact-title">{contactCopy.title}</h2>
            <p className="closing__contact-lead">{contactCopy.text}</p>

            <ul className="closing__socials">
              {socials.map((social) => (
                <li key={social.id}>
                  <a
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-cursor={social.label.toUpperCase()}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                      <path
                        d={SOCIAL_ART[social.icon]}
                        fill={social.icon === 'email' ? 'none' : 'currentColor'}
                        stroke={social.icon === 'email' ? 'currentColor' : 'none'}
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {social.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <ContactForm />
        </div>
      </div>
    </section>
  )
}
