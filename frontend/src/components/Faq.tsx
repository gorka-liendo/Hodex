import { useState } from 'react'
import Reveal from './Reveal'

/**
 * Faq — preguntas frecuentes. Acordeón claro del design system (componente
 * firma #3a): sin caja ni fondo, solo hairlines divisorias y la flecha ↳ que
 * rota 90° al abrir. La jerarquía la da la tipografía, no el color.
 *
 * IMPORTANTE: las mismas preguntas/respuestas están duplicadas como JSON-LD
 * FAQPage en index.html (SEO) — mantener ambos en sincronía al editar.
 */

const FAQS = [
  {
    q: '¿Qué tipo de procesos se pueden automatizar con IA?',
    a: 'Cualquier tarea repetitiva y de alto volumen: atención al cliente, clasificación y gestión documental, generación de informes, entrada de datos en el CRM, seguimiento de leads, facturación… En la discovery call identificamos cuáles tienen mayor retorno en tu caso concreto.',
  },
  {
    q: '¿Cuánto cuesta un proyecto de automatización?',
    a: 'Depende del alcance. La primera llamada es gratuita y sin compromiso: mapeamos el proceso y te damos un presupuesto cerrado antes de empezar — sin sorpresas ni costes ocultos durante el proyecto.',
  },
  {
    q: '¿Cuánto tiempo tarda en estar funcionando?',
    a: 'Una automatización acotada suele estar en producción en 2–6 semanas. Un producto web a medida, entre 1 y 3 meses según el alcance. Trabajamos por fases: ves resultados funcionando desde las primeras semanas, no al final.',
  },
  {
    q: '¿Necesito conocimientos técnicos para trabajar con Hodex?',
    a: 'No. Nos integramos con las herramientas que ya usas y nos encargamos de toda la parte técnica. Al entregar, formamos a tu equipo para que use el sistema con autonomía en el día a día.',
  },
  {
    q: '¿Qué pasa después de la entrega?',
    a: 'El proyecto no termina en la entrega: ofrecemos mantenimiento, iteración y escalado continuo. El sistema evoluciona con tu negocio y el mismo equipo que lo construyó es el que lo mantiene.',
  },
  {
    q: '¿Trabajáis en remoto o solo en una zona concreta?',
    a: 'Trabajamos en remoto con clientes de toda España. Las sesiones de discovery, seguimiento y formación se hacen por videollamada, con la misma cercanía que una reunión presencial.',
  },
] as const

export default function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <section id="faq" className="border-b border-hodex-line py-24 md:py-32">
      <div className="mx-auto max-w-[1320px] px-6">
        <Reveal>
          <div className="flex items-center gap-4 text-eyebrow uppercase tracking-eyebrow text-hodex-gray">
            FAQ
            <span className="h-px max-w-[220px] flex-1 bg-hodex-line" />
            <span className="text-hodex-gray-light">04</span>
          </div>
          <h2 className="mt-6 font-display text-h2 font-light leading-tight tracking-headline">
            Preguntas frecuentes
          </h2>
        </Reveal>

        <Reveal delay={120}>
          <div className="mt-14 border-t border-hodex-line md:mt-20">
            {FAQS.map((faq, i) => {
              const open = openIndex === i
              return (
                <div key={faq.q} className="border-b border-hodex-line">
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setOpenIndex(open ? null : i)}
                    className="flex w-full items-center justify-between gap-6 py-6 text-left"
                  >
                    <h3 className="m-0 font-display text-lg font-light uppercase tracking-headline md:text-[22px]">
                      {faq.q}
                    </h3>
                    <span
                      aria-hidden="true"
                      className={`shrink-0 text-xl transition-transform duration-300 ease-out ${
                        open ? 'rotate-90' : ''
                      }`}
                    >
                      ↳
                    </span>
                  </button>
                  <div
                    className={`grid overflow-hidden transition-all duration-300 ease-out ${
                      open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                    }`}
                  >
                    <p className="m-0 min-h-0 max-w-[640px] pb-6 text-small leading-body text-hodex-gray">
                      {faq.a}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </Reveal>
      </div>
    </section>
  )
}
