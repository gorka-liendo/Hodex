import { useState } from 'react'
import Reveal from './Reveal'

/**
 * Process — "Cómo trabajamos". Acordeón oscuro del design system (componente
 * firma #3b): caja hairline, badge de índice arriba a la derecha, fondo casi
 * imperceptible; un solo paso abierto a la vez. 100% monocromo — el cobre de
 * esta zona de la página vive en el CTA de Contact.
 */

const STEPS = [
  {
    index: '01',
    title: 'Discovery Call',
    desc: 'Una llamada para entender tus procesos actuales y detectar dónde la automatización y la IA tienen mayor impacto en tu negocio. Sin compromiso y sin jerga técnica.',
  },
  {
    index: '02',
    title: 'Workflow Mapping',
    desc: 'Mapeamos el flujo de trabajo y diseñamos la solución a medida de tu operación: qué se automatiza, qué se construye y en qué orden, con alcance y presupuesto cerrados.',
  },
  {
    index: '03',
    title: 'AI & Web Implementation',
    desc: 'Desarrollo del producto: agentes de IA, integraciones con tus herramientas (CRM, soporte, operaciones) y plataformas web construidas para escalar.',
  },
  {
    index: '04',
    title: 'Ongoing Support',
    desc: 'Mantenimiento, iteración y escalado continuo del sistema entregado. El producto evoluciona con el negocio — no termina en la entrega.',
  },
] as const

export default function Process() {
  const [openIndex, setOpenIndex] = useState(0)

  return (
    <section id="process" className="bg-hodex-black py-24 text-hodex-white md:py-32">
      <div className="mx-auto max-w-[1320px] px-6">
        <Reveal>
          <div className="flex items-center gap-4 text-eyebrow uppercase tracking-eyebrow text-hodex-white/55">
            Cómo trabajamos
            <span className="h-px max-w-[220px] flex-1 bg-hodex-line-dark" />
            <span className="text-hodex-white/30">02</span>
          </div>
          <h2 className="mt-6 font-display text-h2 font-light leading-tight tracking-headline">
            Proceso
          </h2>
          <p className="mt-6 max-w-[640px] text-body-lg leading-body">
            <b className="font-semibold text-hodex-white">
              Cuatro fases, un responsable, cero sorpresas.
            </b>{' '}
            <span className="text-hodex-white/55">
              El mismo equipo que analiza tu proceso es el que diseña, construye y
              mantiene la solución.
            </span>
          </p>
        </Reveal>

        <div className="mt-14 flex flex-col gap-2 md:mt-20">
          {STEPS.map((step, i) => {
            const open = openIndex === i
            return (
              <Reveal key={step.index} delay={i * 80}>
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => setOpenIndex(i)}
                  className={`relative w-full border p-6 text-left transition-all duration-300 ${
                    open
                      ? 'border-hodex-white/40 bg-hodex-white/[0.04]'
                      : 'border-hodex-line-dark bg-hodex-white/[0.02] hover:border-hodex-white/25'
                  }`}
                >
                  <span
                    className={`absolute right-4 top-4 border px-2 py-0.5 text-[11px] transition-colors duration-300 ${
                      open
                        ? 'border-hodex-white text-hodex-white'
                        : 'border-hodex-line-dark text-hodex-white/55'
                    }`}
                  >
                    {step.index}/
                  </span>
                  <h3 className="max-w-[calc(100%-64px)] font-display text-lg font-light uppercase tracking-headline">
                    {step.title}
                  </h3>
                  <div
                    className={`grid overflow-hidden transition-all duration-300 ease-out ${
                      open ? 'mt-3 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                    }`}
                  >
                    <p className="m-0 min-h-0 max-w-[560px] text-small leading-body text-hodex-white/55">
                      {step.desc}
                    </p>
                  </div>
                </button>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}
