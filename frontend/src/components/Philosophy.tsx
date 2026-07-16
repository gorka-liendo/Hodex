import Reveal from './Reveal'

/**
 * Philosophy — componente firma del design system: wordmark fantasma gigante
 * (blanco al 4.5%) detrás de una cita display light. Sección oscura, 100%
 * monocroma. El ghost se oculta en pantallas pequeñas (como en el DS) y es
 * puramente decorativo (aria-hidden).
 */

export default function Philosophy() {
  return (
    <section className="relative overflow-hidden bg-hodex-black py-24 text-hodex-white md:py-32">
      {/* Ghost wordmark — decorativo, detrás del contenido */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 select-none whitespace-nowrap font-display text-[22vw] font-extralight text-hodex-white/[0.045] md:block"
      >
        HODEX
      </div>

      <div className="relative z-10 mx-auto max-w-[1320px] px-6">
        <Reveal>
          <div className="flex items-center gap-4 text-eyebrow uppercase tracking-eyebrow text-hodex-white/55">
            Filosofía
            <span className="h-px max-w-[220px] flex-1 bg-hodex-line-dark" />
          </div>
          <blockquote className="mt-8 max-w-[780px] font-display text-h3 font-light leading-[1.2] md:text-quote">
            El negocio moderno no se construye sobre trabajo manual. Se construye
            sobre automatización, inteligencia y sistemas que escalan.
          </blockquote>
          <p className="mt-6 max-w-[520px] text-small leading-body text-hodex-white/50">
            En un mercado que se mueve rápido, los flujos impulsados por IA y los
            productos web bien construidos son la base de la resiliencia operativa.
          </p>
        </Reveal>
      </div>
    </section>
  )
}
