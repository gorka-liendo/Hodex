import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

/**
 * Header flotante de Hodex — barra despegada del borde, esquinas a 90° (radius 0,
 * fiel a la marca), fondo con blur y hairline. Animaciones: entrada al montar,
 * elevación al hacer scroll, underline en hover, panel móvil con stagger.
 *
 * Nota de marca: el CTA va en NEGRO, no cobre. El header es persistente, así que
 * el cobre se reserva para el CTA principal de cada sección ("cobre 1× por pantalla").
 */

const LINKS = [
  { label: 'Servicios', href: '/servicios', match: '/servicios' },
  { label: 'Proyectos', href: '/#work', match: '/proyectos' },
  { label: 'Proceso', href: '/#process' },
  { label: 'Preguntas', href: '/#faq' },
  { label: 'Contacto', href: '/contacto', match: '/contacto' },
] as const

/** ¿Estamos en la sección de ese enlace? (incluye sus subpáginas). */
const isActive = (link: (typeof LINKS)[number], pathname: string) =>
  'match' in link && (pathname === link.match || pathname.startsWith(`${link.match}/`))

export default function Header() {
  const { pathname } = useLocation()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  // Elevación / compactado al hacer scroll.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Bloquear scroll del body con el menú móvil abierto.
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-4">
      {/* Animación de entrada en CSS puro (motion-safe respeta reduced-motion) */}
      <div className="pointer-events-auto mt-3 w-full max-w-[1320px] motion-safe:animate-fade-down md:mt-5">
        {/* ===== Barra ===== */}
        <nav
          className={`flex items-center justify-between border border-hodex-line px-5 backdrop-blur-xl transition-all duration-500 ease-out md:px-7 ${
            scrolled
              ? 'bg-hodex-white/95 py-2.5 shadow-[0_8px_30px_rgba(17,16,16,0.08)]'
              : 'bg-hodex-white/60 py-3.5 shadow-[0_4px_20px_rgba(17,16,16,0.04)]'
          }`}
        >
          {/* Wordmark */}
          <Link to="/" aria-label="Hodex, inicio" className="flex items-center gap-2 transition-opacity hover:opacity-70">
            <img
              src="/hodex-isotipo.svg"
              alt=""
              width={221}
              height={200}
              className="h-6 w-auto md:h-7"
            />
            <span className="font-display text-xl font-light tracking-headline text-hodex-black">
              HODEX
            </span>
          </Link>

          {/* Nav desktop */}
          <ul className="hidden items-center gap-8 md:flex">
            {LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  to={link.href}
                  aria-current={isActive(link, pathname) ? 'page' : undefined}
                  className={`group relative text-eyebrow uppercase tracking-eyebrow transition-colors duration-300 hover:text-hodex-black ${
                    isActive(link, pathname) ? 'text-hodex-black' : 'text-hodex-gray'
                  }`}
                >
                  {link.label}
                  <span
                    className={`absolute -bottom-1.5 left-0 h-px w-full origin-left bg-hodex-black transition-transform duration-300 ease-out group-hover:scale-x-100 ${
                      isActive(link, pathname) ? 'scale-x-100' : 'scale-x-0'
                    }`}
                  />
                </Link>
              </li>
            ))}
          </ul>

          {/* CTA desktop (negro, nunca cobre) */}
          <Link
            to="/contacto"
            className="hidden items-center bg-hodex-black px-5 py-2.5 text-eyebrow uppercase tracking-eyebrow text-hodex-white transition-all duration-300 hover:-translate-y-px hover:shadow-[0_6px_20px_rgba(17,16,16,0.25)] md:inline-flex"
          >
            Hablemos
          </Link>

          {/* Hamburguesa (móvil) */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={open}
            className="flex h-8 w-8 flex-col items-center justify-center gap-[6px] md:hidden"
          >
            <span
              className={`h-px w-5 bg-hodex-black transition-all duration-300 ${
                open ? 'translate-y-[7px] rotate-45' : ''
              }`}
            />
            <span
              className={`h-px w-5 bg-hodex-black transition-all duration-300 ${
                open ? 'opacity-0' : ''
              }`}
            />
            <span
              className={`h-px w-5 bg-hodex-black transition-all duration-300 ${
                open ? '-translate-y-[7px] -rotate-45' : ''
              }`}
            />
          </button>
        </nav>

        {/* ===== Panel móvil ===== */}
        <div
          className={`overflow-hidden border-hodex-line bg-hodex-white/95 backdrop-blur-xl transition-all duration-[400ms] ease-out md:hidden ${
            open
              ? 'max-h-96 border-x border-b opacity-100'
              : 'max-h-0 opacity-0'
          }`}
        >
          <ul className="flex flex-col divide-y divide-hodex-line px-5">
            {LINKS.map((link, i) => (
              <li key={link.href}>
                <Link
                  to={link.href}
                  onClick={() => setOpen(false)}
                  style={{ transitionDelay: open ? `${100 + i * 60}ms` : '0ms' }}
                  className={`block py-4 font-display text-2xl font-light uppercase tracking-headline text-hodex-black transition-all duration-300 ${
                    open ? 'translate-x-0 opacity-100' : '-translate-x-3 opacity-0'
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="px-5 pb-5 pt-2">
            <Link
              to="/contacto"
              onClick={() => setOpen(false)}
              className="block bg-hodex-black py-4 text-center text-eyebrow uppercase tracking-eyebrow text-hodex-white transition-opacity hover:opacity-90"
            >
              Hablemos
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}
