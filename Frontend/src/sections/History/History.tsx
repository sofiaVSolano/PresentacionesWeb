import { useRef } from 'react'
import { gsap, ScrollTrigger } from '@/animations/gsap'
import { useGsapContext } from '@/hooks/useGsapContext'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { KineticText } from '@/components/KineticText/KineticText'
import { SectionHeading } from '@/components/SectionHeading/SectionHeading'
import { history } from '@/data/history'
import { historyPhotos } from '@/data/historyPhotos'
import './History.css'

/** Debajo de este ancho la galería se recorre en vertical, sin fijar la sección */
const HORIZONTAL_MIN = 860

const pad = (n: number) => String(n + 1).padStart(2, '0')

export function History() {
  const sectionRef = useRef<HTMLElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLOListElement>(null)
  const railRef = useRef<HTMLDivElement>(null)
  const ticksRef = useRef<HTMLDivElement>(null)
  const prefersReducedMotion = usePrefersReducedMotion()

  useGsapContext(
    () => {
      const section = sectionRef.current
      const stage = stageRef.current
      const track = trackRef.current
      const rail = railRef.current
      const ticks = ticksRef.current
      if (!section || !stage || !track || !rail || !ticks) return

      const cards = gsap.utils.toArray<HTMLElement>('.history__card')
      const horizontal = !prefersReducedMotion && window.innerWidth >= HORIZONTAL_MIN

      // Entrada: cada tarjeta se destapa de abajo a arriba, no solo aparece
      cards.forEach((card, i) => {
        gsap.fromTo(
          card,
          { y: 56, opacity: 0, clipPath: 'inset(0 0 12% 0 round 18px)' },
          {
            y: 0,
            opacity: 1,
            clipPath: 'inset(0 0 0% 0 round 18px)',
            duration: 0.8,
            delay: horizontal ? i * 0.07 : 0,
            ease: 'power3.out',
            clearProps: 'transform,opacity,clipPath',
            scrollTrigger: { trigger: horizontal ? section : card, start: 'top 85%', once: true },
          }
        )
      })

      if (!horizontal) {
        rail.style.display = 'none'
        return
      }

      // El scroll vertical empuja la galería de lado: la sección se fija mientras dura
      const distance = () => Math.max(0, track.scrollWidth - stage.clientWidth)

      // Medidas cacheadas: leerlas en cada fotograma forzaría recálculos de diseño
      // El foco no va en el centro exacto sino algo a la izquierda: así la
      // primera tarjeta ya es la protagonista nada más entrar en la sección.
      const focusAt = () => stage.clientWidth * 0.42

      let geometry: { el: HTMLElement; img: HTMLElement | null; mid: number }[] = []
      const marks = gsap.utils.toArray<HTMLElement>('.history__tick', ticks)

      const measure = () => {
        geometry = cards.map((el) => ({
          el,
          // solo las fotos recortables llevan paralaje; los diplomas se deformarían
          img: el.querySelector<HTMLElement>('.history__frame[data-fit="cover"] img'),
          mid: el.offsetLeft + el.offsetWidth / 2,
        }))
        // Cada marca se coloca en el punto del recorrido donde su parada manda
        const total = distance() || 1
        marks.forEach((mark, i) => {
          const at = Math.min(1, Math.max(0, (geometry[i].mid - focusAt()) / total))
          mark.style.left = `${(at * 100).toFixed(2)}%`
          mark.dataset.at = String(at)
        })
      }
      measure()

      const paint = (progress: number) => {
        const x = -distance() * progress
        const center = focusAt()

        geometry.forEach((g) => {
          const offset = (g.mid + x - center) / stage.clientWidth
          const distanceToCenter = Math.abs(offset)
          // 1 en el punto de foco, 0 en los bordes: gobierna brillo y escala
          g.el.style.setProperty('--near', Math.max(0, 1 - distanceToCenter * 1.9).toFixed(3))
          // la foto se mueve dentro de su marco: da profundidad al desplazamiento
          if (g.img) g.img.style.transform = `translateX(${(-offset * 6).toFixed(2)}%) scale(1.13)`
        })

        marks.forEach((mark) => {
          mark.dataset.on = String(progress + 0.001 >= Number(mark.dataset.at ?? 0))
        })
      }

      gsap.to(track, {
        x: () => -distance(),
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: () => `+=${distance()}`,
          pin: stage,
          scrub: 0.8,
          invalidateOnRefresh: true,
          onRefresh: () => {
            measure()
            paint(0)
          },
          onUpdate: (self) => {
            rail.style.transform = `scaleX(${self.progress})`
            paint(self.progress)
          },
        },
      })

      // Las medidas del recorrido dependen del ancho de los textos: hasta que no
      // están las fuentes reales, el largo calculado se queda corto y la última
      // tarjeta no llega a entrar. Lo mismo al cambiar el tamaño de la ventana.
      let cancelled = false
      void document.fonts?.ready.then(() => {
        if (!cancelled) ScrollTrigger.refresh()
      })

      const onResize = () => ScrollTrigger.refresh()
      window.addEventListener('resize', onResize)
      return () => {
        cancelled = true
        window.removeEventListener('resize', onResize)
      }
    },
    [prefersReducedMotion],
    sectionRef
  )

  return (
    <section className="history" id="section-historia" ref={sectionRef} aria-label="Mi historia">
      <div className="history__stage" ref={stageRef}>
        <div className="history__header">
          <SectionHeading number="05" label="Mi historia" />
          <KineticText
            className="history__headline"
            text="Tecnología puesta a resolver. Nunca sola."
            accent={['Nunca', 'sola.']}
          />
          <p className="history__lead">
            Congresos y hackathones, en orden: de lo primero a lo último. Ninguno lo gané sola —
            detrás de cada parada hubo un equipo.
          </p>
        </div>

        <ol className="history__track" ref={trackRef}>
          {history.map((entry, i) => {
            const photo = entry.photo ? historyPhotos[entry.photo] : null
            return (
              <li className="history__card" key={entry.id}>
                <figure className="history__figure">
                  {/* El ancho de la tarjeta sale de la proporción real de la foto:
                      así cada una conserva su forma y el sitio queda reservado. */}
                  <div
                    className="history__frame"
                    data-fit={entry.fit ?? 'cover'}
                    data-empty={!photo}
                    style={photo ? ({ '--ratio': photo.width / photo.height } as React.CSSProperties) : undefined}
                  >
                    {photo ? (
                      <img
                        src={photo.src}
                        width={photo.width}
                        height={photo.height}
                        alt={`${entry.title} — ${entry.event}. ${entry.result}.`}
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      // Sin foto: la tarjeta se sostiene sola con tipografía
                      <span className="history__poster" aria-hidden="true">
                        <span className="history__poster-title">{entry.title}</span>
                        <span className="history__poster-place">{entry.event}</span>
                      </span>
                    )}
                  </div>

                  <figcaption className="history__meta">
                    <span className="history__num">{pad(i)}</span>
                    <span className="history__result">{entry.result}</span>
                    <h3 className="history__title">{entry.title}</h3>
                    <p className="history__event">{entry.event}</p>
                    {entry.detail && <p className="history__detail">{entry.detail}</p>}
                    <p className="history__team">
                      <span className="history__team-mark" aria-hidden="true" />
                      {entry.team?.length ? `En equipo con ${entry.team.join(' y ')}` : 'En equipo'}
                    </p>
                  </figcaption>
                </figure>
              </li>
            )
          })}

          {/* Cierre de la galería: el mensaje que sostiene todo lo anterior */}
          <li className="history__card history__card--closing">
            <div className="history__closing">
              <span className="history__closing-kicker">Y sobre todo</span>
              <p className="history__closing-text">
                Detrás de cada puesto hubo un equipo. Los premios llevan más de un nombre.
              </p>
            </div>
          </li>
        </ol>

        <div className="history__progress" aria-hidden="true">
          <div className="history__rail" ref={railRef} />
          <div className="history__ticks" ref={ticksRef}>
            {history.map((entry, i) => (
              <span className="history__tick" key={entry.id}>
                <b>{pad(i)}</b>
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
