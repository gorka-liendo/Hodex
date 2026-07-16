import Reveal from './Reveal'

/**
 * About — "Quiénes somos". Sección clara, fiel al design system:
 * eyebrow + h2 display light, lead paragraph (primera frase bold negro,
 * resto gris) y grid de disciplinas con el tratamiento "trust card"
 * (caja hairline, título display uppercase, descripción gris).
 * 100% monocroma — sin cobre (reservado al CTA principal de contacto).
 */

const DISCIPLINES = [
  {
    index: '01',
    title: 'AI Integration',
    desc: 'Agentes a medida, flujos con LLMs y automatización inteligente integrada en tus herramientas: CRM, soporte, operaciones.',
  },
  {
    index: '02',
    title: 'Process Automation',
    desc: 'Sistemas centrados en eliminar trabajo manual repetitivo, reduciendo tiempo operativo y errores en tareas de alto volumen.',
  },
  {
    index: '03',
    title: 'Custom Web Products',
    desc: 'Plataformas, dashboards y productos web a medida, construidos para escalar con el negocio desde el primer día.',
  },
  {
    index: '04',
    title: 'Technical Advisory',
    desc: 'Estrategia digital a medida de cada empresa: qué automatizar, qué construir y en qué orden, con criterio técnico.',
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
            Estudio de IA, automatización y producto digital
          </h2>
          <p className="mt-6 max-w-[640px] text-body-lg leading-body">
            <b className="font-semibold text-hodex-black">
              Hodex es un estudio full-cycle: estrategia, diseño y desarrollo bajo el
              mismo techo.
            </b>{' '}
            <span className="text-hodex-gray">
              Ayudamos a empresas a automatizar procesos con inteligencia artificial y
              construimos productos web a medida — precisos, minimalistas y hechos para
              durar. Sin intermediarios, sin ruido: el equipo que diseña es el que
              construye.
            </span>
          </p>
        </Reveal>

        <div className="mt-14 grid gap-2 md:mt-20 md:grid-cols-2">
          {DISCIPLINES.map((d, i) => (
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
