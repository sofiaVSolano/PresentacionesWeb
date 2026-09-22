import { useEffect, useRef, useState } from 'react'
import { useLenis } from 'lenis/react'
import { gsap } from '@/animations/gsap'
import { useActiveSection } from '@/hooks/useActiveSection'
import { navSections, navSectionIds } from '@/data/navigation'
import './Navigation.css'

export function Navigation() {
  const [open, setOpen] = useState(false)
  const activeId = useActiveSection(navSectionIds)
  const railFillRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const lenis = useLenis((instance) => {
    if (railFillRef.current) {
      railFillRef.current.style.transform = `scaleY(${instance.progress})`
    }
  })

  useEffect(() => {
    if (!open || !listRef.current) return
    const items = listRef.current.querySelectorAll('.nav-overlay__item')
    gsap.fromTo(
      items,
      { y: '100%' },
      { y: '0%', duration: 0.6, stagger: 0.06, ease: 'power3.out' }
    )
  }, [open])

  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open])

  function goTo(id: string) {
    setOpen(false)
    const el = document.getElementById(id)
    if (el && lenis) lenis.scrollTo(el, { offset: 0 })
  }

  return (
    <>
      <button
        className="nav-toggle"
        data-cursor={open ? 'CLOSE' : 'MENU'}
        aria-expanded={open}
        aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="nav-toggle__line" />
        <span className="nav-toggle__line" />
      </button>

      <div className="nav-rail" aria-hidden="true">
        <div className="nav-rail__track">
          <div className="nav-rail__fill" ref={railFillRef} />
        </div>
      </div>

      {open && (
        <nav className="nav-overlay" aria-label="Navegación principal">
          <ul className="nav-overlay__list" ref={listRef}>
            {navSections.map((section) => (
              <li key={section.id}>
                <button
                  className={`nav-overlay__item${activeId === section.id ? ' is-active' : ''}`}
                  data-cursor="GO"
                  onClick={() => goTo(section.id)}
                >
                  <span className="nav-overlay__number">{section.number}</span>
                  <span>{section.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </>
  )
}
