import Reveal from './Reveal'

/**
 * Footer — cierre completo fiel al design system ("Get in touch" footer):
 * cabecera grande con el año, grid de info en 3 columnas (hairlines), nav,
 * wordmark HODEX a sangre con degradado metálico (text-metallic) y línea
 * legal con enlace "volver arriba". Sin CTA de cobre — ya vive en Contact.
 */

const NAV = [
  { label: 'Quiénes somos', href: '#about' },
  { label: 'Proyectos', href: '#work' },
  { label: 'Partners', href: '#partners' },
  { label: 'Clientes', href: '#clients' },
  { label: 'Contacto', href: '#contact' },
] as const

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
          <div className="grid gap-10 py-10 md:grid-cols-3 md:py-14">
            <div>
              <div className="mb-3 text-eyebrow uppercase tracking-eyebrow text-hodex-white/50">
                Estudio
              </div>
              <p className="m-0 max-w-[280px] text-small leading-body text-hodex-white/70">
                Estudio full-cycle de IA, automatización y producto digital.
                Estrategia, diseño y desarrollo bajo el mismo techo.
              </p>
            </div>

            <div>
              <div className="mb-3 text-eyebrow uppercase tracking-eyebrow text-hodex-white/50">
                Contacto
              </div>
              <p className="m-0">
                <a
                  href="mailto:contact@hodex.es"
                  className="text-[15px] text-hodex-white transition-opacity duration-300 hover:opacity-70"
                >
                  contact@hodex.es
                </a>
              </p>
              <div className="mb-3 mt-6 text-eyebrow uppercase tracking-eyebrow text-hodex-white/50">
                Ubicación
              </div>
              <p className="m-0 text-[15px] text-hodex-white/70">España · Remoto</p>
            </div>

            <nav aria-label="Enlaces del pie">
              <div className="mb-3 text-eyebrow uppercase tracking-eyebrow text-hodex-white/50">
                Índice
              </div>
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {NAV.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      className="group relative inline-block text-[15px] text-hodex-white/70 transition-colors duration-300 hover:text-hodex-white"
                    >
                      {link.label}
                      <span className="absolute -bottom-0.5 left-0 h-px w-full origin-left scale-x-0 bg-hodex-white/60 transition-transform duration-300 ease-out group-hover:scale-x-100" />
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
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
        <a
          href="#top"
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
