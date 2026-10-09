import Reveal from './Reveal'

/**
 * About — "Quiénes somos". Sección clara, fiel al design system:
 * eyebrow + h2 display light, lead paragraph (primera frase bold negro,
 * resto gris) y tres principios con el tratamiento "trust card"
 * (caja hairline, título display uppercase, descripción gris).
 * 100% monocroma — sin cobre (reservado al CTA principal de contacto).
 */

const PRINCIPLES = [
  {
    index: '01',
    title: 'Un solo equipo',
    desc: 'Quien analiza tu proyecto es quien lo diseña, lo construye y lo mantiene. Sin intermediarios ni mensajes que se pierden por el camino.',
  },
  {
    index: '02',
    title: 'Presupuesto cerrado',
    desc: 'Antes de empezar sabes qué se va a hacer, en qué orden y cuánto cuesta. Sin sorpresas durante el proyecto.',
  },
  {
    index: '03',
    title: 'Cerca de ti',
    desc: 'Estamos en Castro Urdiales (Cantabria) y trabajamos con empresas de Cantabria, Bizkaia y toda España.',
  },
] as const

export default function About() {
  return (
    <section id="about" className="border-b border-hodex-line py-24 md:py-32">
      <div className="mx-auto max-w-[1320px] px-6">
        <Reveal>
          <div className="flex items-center gap-4 text-eyebrow uppercase tracking-eyebrow text-hodex-gray">
            Quiénes somos
            <span className="h-px max-w-[220px] flex-1 bg-hodex-line" />
            <span className="text-hodex-gray-light">01</span>
          </div>
          <h2 className="mt-6 font-display text-h2 font-light leading-tight tracking-headline">
            Estudio de diseño web, desarrollo e inteligencia artificial
          </h2>
          <p className="mt-6 max-w-[640px] text-body-lg leading-body">
            <b className="font-semibold text-hodex-black">
              Hodex es un estudio de producto digital: estrategia, diseño y desarrollo
              bajo el mismo techo.
            </b>{' '}
            <span className="text-hodex-gray">
              Diseñamos webs a medida, desarrollamos aplicaciones y plataformas web y
              automatizamos procesos con inteligencia artificial — productos precisos,
              minimalistas y hechos para durar.
            </span>
          </p>
        </Reveal>

        <div className="mt-14 grid gap-2 md:mt-20 md:grid-cols-3">
          {PRINCIPLES.map((d, i) => (
            <Reveal key={d.index} delay={i * 80}>
              <article className="relative h-full border border-hodex-line p-6 transition-all duration-300 ease-out hover:-translate-y-1 hover:border-hodex-black/30 hover:shadow-[0_12px_40px_rgba(17,16,16,0.08)] md:p-8">
                <span className="absolute right-4 top-4 border border-hodex-line px-2 py-0.5 text-[11px] text-hodex-gray">
                  {d.index}/
                </span>
                <h3 className="max-w-[calc(100%-56px)] font-display text-lg font-light uppercase tracking-headline">
                  {d.title}
                </h3>
                <p className="mt-3 max-w-md text-small leading-body text-hodex-gray">
                  {d.desc}
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
