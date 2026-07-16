import { useEffect, type ReactNode } from 'react'
import Header from '../components/Header'
import Footer from '../components/Footer'

/**
 * LegalLayout — plantilla de las páginas legales (aviso legal, privacidad).
 * Mantiene header y footer del sitio, y presenta el contenido con el design
 * system: eyebrow + h1 display light + prose con hairlines entre secciones.
 * Fija el <title> por página y hace scroll al inicio al montar.
 */
export default function LegalLayout({
  eyebrow,
  title,
  updated,
  children,
}: {
  eyebrow: string
  title: string
  updated: string
  children: ReactNode
}) {
  useEffect(() => {
    document.title = `${title} — Hodex`
    window.scrollTo(0, 0)
    return () => {
      document.title = 'Hodex — Automatización con IA y productos web a medida'
    }
  }, [title])

  return (
    <div>
      <Header />
      <main className="pb-24 pt-40 md:pb-32">
        <div className="mx-auto max-w-[820px] px-6">
          <div className="flex items-center gap-4 text-eyebrow uppercase tracking-eyebrow text-hodex-gray">
            {eyebrow}
            <span className="h-px max-w-[220px] flex-1 bg-hodex-line" />
          </div>
          <h1 className="mt-6 font-display text-h2 font-light leading-tight tracking-headline">
            {title}
          </h1>
          <p className="mt-3 text-small text-hodex-gray-light">
            Última actualización: {updated}
          </p>
          <div className="mt-12">{children}</div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

/** Sección de un documento legal: título display + cuerpo gris, con hairline. */
export function LegalSection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="border-t border-hodex-line py-8">
      <h2 className="font-display text-h3 font-light leading-tight tracking-headline">
        {title}
      </h2>
      <div className="mt-4 flex flex-col gap-4 leading-body text-hodex-gray [&_a]:text-hodex-black [&_a]:underline [&_a]:underline-offset-2 [&_b]:font-semibold [&_b]:text-hodex-black [&_ul]:m-0 [&_ul]:flex [&_ul]:list-none [&_ul]:flex-col [&_ul]:gap-2 [&_ul]:p-0 [&_li]:border-l [&_li]:border-hodex-line [&_li]:pl-4">
        {children}
      </div>
    </section>
  )
}
