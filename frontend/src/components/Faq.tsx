import { useState } from 'react'
import Reveal from './Reveal'
import { HOME_FAQS } from '../content/faqs'

/**
 * Faq — preguntas frecuentes. Acordeón claro del design system (componente
 * firma #3a): sin caja ni fondo, solo hairlines divisorias y la flecha ↳ que
 * rota 90° al abrir. La jerarquía la da la tipografía, no el color.
 *
 * Las preguntas viven en content/faqs.ts: de ahí salen también los datos
 * estructurados (FAQPage) para Google, así que no hay que duplicarlas.
 */



export default function Faq({
  faqs = HOME_FAQS,
  title = 'Preguntas frecuentes',
  index = '05',
  id = 'faq',
}: {
  faqs?: ReadonlyArray<{ q: string; a: string }>
  title?: string
  index?: string
  id?: string
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <section id={id} className="border-b border-hodex-line py-24 md:py-32">
      <div className="mx-auto max-w-[1320px] px-6">
        <Reveal>
          <div className="flex items-center gap-4 text-eyebrow uppercase tracking-eyebrow text-hodex-gray">
            Preguntas
            <span className="h-px max-w-[220px] flex-1 bg-hodex-line" />
            <span className="text-hodex-gray-light">{index}</span>
          </div>
          <h2 className="mt-6 font-display text-h2 font-light leading-tight tracking-headline">
            {title}
          </h2>
        </Reveal>

        <Reveal delay={120}>
          <div className="mt-14 border-t border-hodex-line md:mt-20">
            {faqs.map((faq, i) => {
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
