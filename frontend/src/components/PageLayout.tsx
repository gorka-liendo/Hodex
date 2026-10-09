import { useEffect, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import Footer from './Footer'
import Header from './Header'
import Reveal from './Reveal'

/** Estructura de las páginas interiores: header, contenido y footer. */
export default function PageLayout({ children }: { children: ReactNode }) {
  // Al llegar a una página nueva, arriba del todo (salvo que traiga ancla).
  useEffect(() => {
    if (!window.location.hash) window.scrollTo(0, 0)
  }, [])

  return (
    <div id="top">
      <Header />
      <main>{children}</main>
      <Footer />
    </div>
  )
}

export type Crumb = { name: string; to: string }

/**
 * Cabecera oscura de página: migas de pan (también en datos estructurados),
 * h1 display light y lead (primera frase en blanco, resto atenuado). El CTA,
 * si lo hay, es el único cobre de la pantalla.
 */
export function PageHero({
  crumbs,
  eyebrow,
  title,
  lead,
  cta,
  ghost,
  children,
}: {
  crumbs: Crumb[]
  eyebrow: string
  title: string
  lead: { strong: string; rest: string }
  cta?: { label: string; to: string }
  /** Texto fantasma gigante a la derecha (decorativo, como el ghost wordmark). */
  ghost?: string
  children?: ReactNode
}) {
  return (
    <section className="relative overflow-hidden bg-hodex-black pb-20 pt-36 text-hodex-white md:pb-28 md:pt-44">
      {ghost && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-[2vw] bottom-0 hidden select-none font-display text-[26vw] font-extralight leading-[0.8] tracking-wordmark text-hodex-white/[0.045] lg:block xl:text-[360px]"
        >
          {ghost}
        </div>
      )}
      <div className="relative z-10 mx-auto max-w-[1320px] px-6">
        <Reveal>
          <nav aria-label="Migas de pan">
            <ol className="m-0 flex list-none flex-wrap items-center gap-2 p-0 text-small text-hodex-white/50">
              {crumbs.map((crumb, i) => (
                <li key={crumb.to} className="flex items-center gap-2">
                  {i > 0 && <span aria-hidden="true">/</span>}
                  {i === crumbs.length - 1 ? (
                    <span aria-current="page" className="text-hodex-white/80">
                      {crumb.name}
                    </span>
                  ) : (
                    <Link to={crumb.to} className="transition-colors duration-300 hover:text-hodex-white">
                      {crumb.name}
                    </Link>
                  )}
                </li>
              ))}
            </ol>
          </nav>
          <div className="mt-12 flex items-center gap-4 text-eyebrow uppercase tracking-eyebrow text-hodex-white/55">
            {eyebrow}
            <span className="h-px max-w-[220px] flex-1 bg-hodex-line-dark" />
          </div>
          <h1 className="mt-6 max-w-[900px] font-display text-[40px] font-extralight leading-tight tracking-headline md:text-h1">
            {title}
          </h1>
          <p className="mt-8 max-w-[680px] text-body-lg leading-body">
            <b className="font-semibold text-hodex-white">{lead.strong}</b>{' '}
            <span className="text-hodex-white/55">{lead.rest}</span>
          </p>
        </Reveal>
        {cta && (
          <Reveal delay={150}>
            <CopperLink to={cta.to} className="mt-10">
              {cta.label}
            </CopperLink>
          </Reveal>
        )}
        {children}
      </div>
    </section>
  )
}

/** CTA principal de cobre (máximo uno por pantalla). */
export function CopperLink({ to, children, className = '' }: { to: string; children: ReactNode; className?: string }) {
  return (
    <Link
      to={to}
      className={`group inline-flex items-center gap-2 bg-copper-gradient px-7 py-4 text-eyebrow font-semibold uppercase tracking-eyebrow text-hodex-white transition-all duration-300 hover:-translate-y-px hover:shadow-[0_10px_30px_rgba(180,56,1,0.35)] ${className}`}
    >
      {children}
      <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1">
        &rarr;
      </span>
    </Link>
  )
}

/** Eyebrow de sección sobre fondo claro: label + línea + índice. */
export function SectionEyebrow({ children, index }: { children: ReactNode; index?: string }) {
  return (
    <div className="flex items-center gap-4 text-eyebrow uppercase tracking-eyebrow text-hodex-gray">
      {children}
      <span className="h-px max-w-[220px] flex-1 bg-hodex-line" />
      {index && <span className="text-hodex-gray-light">{index}</span>}
    </div>
  )
}

/** Cierre de página: invitación a hablar, oscuro, con el CTA de cobre (sin ghost: el footer ya lleva el wordmark). */
export function ClosingCta({ title, text }: { title: string; text: string }) {
  return (
    <section className="border-b border-hodex-line-dark bg-hodex-black py-24 text-hodex-white md:py-32">
      <div className="mx-auto max-w-[1320px] px-6">
        <Reveal>
          <div className="flex items-center gap-4 text-eyebrow uppercase tracking-eyebrow text-hodex-white/55">
            Hablemos
            <span className="h-px max-w-[220px] flex-1 bg-hodex-line-dark" />
          </div>
          <h2 className="mt-6 max-w-[780px] font-display text-h2 font-light leading-tight tracking-headline">{title}</h2>
          <p className="mt-6 max-w-[560px] leading-body text-hodex-white/55">{text}</p>
          <CopperLink to="/contacto" className="mt-10">
            Cuéntanos tu proyecto
          </CopperLink>
        </Reveal>
      </div>
    </section>
  )
}
