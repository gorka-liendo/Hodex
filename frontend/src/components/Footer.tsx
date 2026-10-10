import { Link } from 'react-router-dom'
import { PROJECTS } from '../content/projects'
import { SERVICES } from '../content/services'
import { SITE } from '../content/site'
import Reveal from './Reveal'

/**
 * Footer — cierre completo fiel al design system ("Get in touch" footer):
 * cabecera grande con el año, grid de info (estudio, servicios, proyectos,
 * contacto y ubicación),
 * wordmark HODEX a sangre con degradado metálico (text-metallic) y línea
 * legal con enlace "volver arriba". Sin CTA de cobre — ya vive en Contact.
 */

/** Columnas de enlaces: también ayudan a Google a descubrir cada página. */
const COLUMNS = [
  {
    title: 'Servicios',
    links: [
      ...SERVICES.map((s) => ({ label: s.name, href: `/servicios/${s.slug}` })),
      { label: 'Todos los servicios', href: '/servicios' },
    ],
  },
  {
    title: 'Explora',
    links: [
      ...PROJECTS.map((p) => ({ label: p.name, href: `/proyectos/${p.slug}` })),
      { label: 'Proceso', href: '/#process' },
      { label: 'Preguntas frecuentes', href: '/#faq' },
    ],
  },
]

const linkClass =
  'group relative inline-block text-[15px] text-hodex-white/70 transition-colors duration-300 hover:text-hodex-white'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="overflow-hidden border-t border-hodex-line-dark bg-hodex-black pb-8 pt-16 text-hodex-white md:pt-24">
      <div className="mx-auto max-w-[1320px] px-6">
        {/* ===== Cabecera ===== */}
        <Reveal>
          <div className="flex items-end justify-between border-b border-hodex-line-dark pb-8">
            <p className="m-0 max-w-[520px] font-display text-h3 font-light leading-tight tracking-headline md:text-[44px] md:leading-[1.05]">
              Automatización, inteligencia
              <br />y sistemas que escalan.
            </p>
            <span className="font-display text-2xl font-light text-hodex-white/60 md:text-[32px]">
              {year}
            </span>
          </div>
        </Reveal>

        {/* ===== Grid de info ===== */}
        <Reveal delay={100}>
          <div className="grid gap-10 py-10 sm:grid-cols-2 md:grid-cols-4 md:py-14">
            <div>
              <div className="mb-3 text-eyebrow uppercase tracking-eyebrow text-hodex-white/50">
                Estudio
              </div>
              <p className="m-0 max-w-[280px] text-small leading-body text-hodex-white/70">
                Estudio de diseño web, aplicaciones a medida e inteligencia artificial.
                Estrategia, diseño y desarrollo bajo el mismo techo.
              </p>
            </div>

            {COLUMNS.map((column) => (
              <nav key={column.title} aria-label={column.title}>
                <div className="mb-3 text-eyebrow uppercase tracking-eyebrow text-hodex-white/50">
                  {column.title}
                </div>
                <ul className="m-0 flex list-none flex-col gap-2 p-0">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <Link to={link.href} className={linkClass}>
                        {link.label}
                        <span className="absolute -bottom-0.5 left-0 h-px w-full origin-left scale-x-0 bg-hodex-white/60 transition-transform duration-300 ease-out group-hover:scale-x-100" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}

            <div>
              <div className="mb-3 text-eyebrow uppercase tracking-eyebrow text-hodex-white/50">
                Contacto
              </div>
              <p className="m-0 flex flex-col gap-2">
                <a href="mailto:team@hodex.es" className={linkClass}>
                  team@hodex.es
                </a>
                <Link to="/contacto" className={linkClass}>
                  Formulario de contacto
                </Link>
                <a href={SITE.instagram} target="_blank" rel="noopener noreferrer me" className={linkClass}>
                  Instagram ↗
                </a>
              </p>
              <div className="mb-3 mt-6 text-eyebrow uppercase tracking-eyebrow text-hodex-white/50">
                Ubicación
              </div>
              <p className="m-0 text-[15px] leading-body text-hodex-white/70">
                Castro Urdiales, Cantabria
                <br />
                Proyectos en toda España
              </p>
            </div>
          </div>
        </Reveal>
      </div>

      {/* ===== Wordmark metálico a sangre ===== */}
      <Reveal delay={150}>
        <div
          aria-hidden="true"
          className="whitespace-nowrap pl-[2vw] font-display text-wordmark font-extralight tracking-wordmark text-metallic"
        >
          HODEX
        </div>
      </Reveal>

      {/* ===== Legal ===== */}
      <div className="mx-auto mt-12 flex max-w-[1320px] flex-col gap-4 border-t border-hodex-line-dark px-6 pt-6 text-small text-hodex-white/50 md:flex-row md:items-center md:justify-between">
        <p className="m-0">© {year} Hodex. Todos los derechos reservados.</p>
        <nav aria-label="Enlaces legales" className="flex gap-6">
          <Link to="/legal/aviso-legal" className="transition-colors duration-300 hover:text-hodex-white">
            Aviso legal
          </Link>
          <Link to="/legal/privacidad" className="transition-colors duration-300 hover:text-hodex-white">
            Privacidad
          </Link>
        </nav>
        <a
          href="/#top"
          className="group inline-flex items-center gap-2 uppercase tracking-eyebrow text-eyebrow transition-colors duration-300 hover:text-hodex-white"
        >
          Volver arriba
          <span className="transition-transform duration-300 ease-out group-hover:-translate-y-1">
            ↑
          </span>
        </a>
      </div>
    </footer>
  )
}
