import { useState } from 'react'
import Reveal from './Reveal'

/**
 * Contact — sección oscura de contacto. Fiel al design system:
 * - Selector de intención reutilizando el "acordeón oscuro" (componente firma #3b):
 *   caja hairline + badge de índice; seleccionado pasa a blanco.
 * - Inputs de solo línea inferior (border-b, transparente, focus → borde blanco).
 * - CTA cobre como ÚNICO acento de color de la pantalla (regla "cobre 1× por pantalla").
 *
 * Envía a POST /api/contact (backend Express + nodemailer). En dev, Vite hace
 * proxy de /api al backend; en producción lo hace nginx.
 */

type Intent = {
  id: string
  index: string
  title: string
  desc: string
}

const INTENTS: Intent[] = [
  {
    id: 'empresa',
    index: '01',
    title: 'Soy una empresa',
    desc: 'Queremos construir o mejorar un producto digital.',
  },
  {
    id: 'automatizar',
    index: '02',
    title: 'Quiero automatizar',
    desc: 'Automatizar procesos o flujos de trabajo con IA.',
  },
  {
    id: 'creador',
    index: '03',
    title: 'Quiero ser creador',
    desc: 'Colaborar o unirme como creador de Hodex.',
  },
  {
    id: 'otro',
    index: '04',
    title: 'Otra cosa',
    desc: 'Cuéntanos qué tienes en mente.',
  },
]

const FIELD_CLASS =
  'w-full border-0 border-b border-hodex-line-dark bg-transparent py-3 font-body text-hodex-white placeholder:text-hodex-white/40 transition-colors duration-300 focus:border-hodex-white focus:outline-none'

export default function Contact() {
  const [intent, setIntent] = useState<string | null>(null)
  const [intentError, setIntentError] = useState(false)
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!intent) {
      setIntentError(true)
      return
    }

    const fd = new FormData(e.currentTarget)
    setSending(true)
    setError(null)
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fd.get('name'),
          email: fd.get('email'),
          company: (fd.get('company') as string) || undefined,
          message: fd.get('message'),
          intent,
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setSent(true)
    } catch {
      setError(
        'No se ha podido enviar el mensaje. Inténtalo de nuevo en un momento o escríbenos a team@hodex.es.',
      )
    } finally {
      setSending(false)
    }
  }

  return (
    <section id="contact" className="bg-hodex-black py-24 text-hodex-white md:py-32">
      <div className="mx-auto max-w-[1320px] px-6">
        <Reveal>
          <div className="flex items-center gap-4 text-eyebrow uppercase tracking-eyebrow text-hodex-white/55">
            Get in touch
            <span className="h-px max-w-[220px] flex-1 bg-hodex-line-dark" />
            <span className="text-hodex-white/30">05</span>
          </div>
          <h2 className="mt-6 font-display text-h2 font-light leading-tight tracking-headline">
            Hablemos
          </h2>
          <p className="mt-6 max-w-[640px] text-body-lg leading-body">
            <b className="font-semibold text-hodex-white">Cuéntanos quién eres.</b>{' '}
            <span className="text-hodex-white/55">
              Nos ayuda a responderte con la persona y el enfoque adecuados desde el
              primer mensaje.
            </span>
          </p>
        </Reveal>

        {sent ? (
          /* ===== Estado de confirmación ===== */
          <Reveal className="mt-16">
            <div className="border-t border-hodex-line-dark pt-16">
              <div className="flex items-center gap-4 text-eyebrow uppercase tracking-eyebrow text-hodex-white/55">
                Mensaje enviado
                <span className="h-px max-w-[220px] flex-1 bg-hodex-line-dark" />
              </div>
              <h3 className="mt-6 max-w-[640px] font-display text-h3 font-light leading-tight">
                Gracias{name ? `, ${name}` : ''}. Hemos recibido tu mensaje y te
                responderemos en breve.
              </h3>
            </div>
          </Reveal>
        ) : (
          <div className="mt-14 grid gap-12 md:mt-20 md:grid-cols-2 md:gap-16">
            {/* ===== Selector de intención ===== */}
            <Reveal>
              <div className="mb-6 flex items-center gap-4 text-eyebrow uppercase tracking-eyebrow text-hodex-white/55">
                ¿Qué te trae por aquí?
              </div>
              <div className="flex flex-col gap-2">
                {INTENTS.map((opt) => {
                  const selected = intent === opt.id
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => {
                        setIntent(opt.id)
                        setIntentError(false)
                      }}
                      className={`relative border p-5 text-left transition-all duration-300 ${
                        selected
                          ? 'border-hodex-white bg-hodex-white/[0.06]'
                          : 'border-hodex-line-dark bg-hodex-white/[0.02] hover:border-hodex-white/40'
                      }`}
                    >
                      <span
                        className={`absolute right-4 top-4 border px-2 py-0.5 text-[11px] transition-colors duration-300 ${
                          selected
                            ? 'border-hodex-white text-hodex-white'
                            : 'border-hodex-line-dark text-hodex-white/55'
                        }`}
                      >
                        {opt.index}/
                      </span>
                      <div
                        className={`font-display text-lg font-light uppercase transition-colors duration-300 ${
                          selected ? 'text-hodex-white' : 'text-hodex-white/90'
                        }`}
                      >
                        {opt.title}
                      </div>
                      <div className="mt-2 max-w-xs text-small text-hodex-white/55">
                        {opt.desc}
                      </div>
                    </button>
                  )
                })}
              </div>
              {intentError && (
                <p className="mt-4 text-small text-hodex-white/55">
                  Selecciona una opción para continuar.
                </p>
              )}
            </Reveal>

            {/* ===== Formulario ===== */}
            <Reveal delay={120}>
              <div className="mb-6 flex items-center gap-4 text-eyebrow uppercase tracking-eyebrow text-hodex-white/55">
                Tus datos
              </div>
              <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                <div>
                  <label htmlFor="name" className="sr-only">
                    Nombre
                  </label>
                  <input
                    id="name"
                    name="name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nombre"
                    className={FIELD_CLASS}
                  />
                </div>
                <div>
                  <label htmlFor="email" className="sr-only">
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    placeholder="Email"
                    className={FIELD_CLASS}
                  />
                </div>
                <div>
                  <label htmlFor="company" className="sr-only">
                    Empresa
                  </label>
                  <input
                    id="company"
                    name="company"
                    placeholder="Empresa (opcional)"
                    className={FIELD_CLASS}
                  />
                </div>
                <div>
                  <label htmlFor="message" className="sr-only">
                    Mensaje
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    required
                    rows={3}
                    placeholder="Cuéntanos tu proyecto"
                    className={`${FIELD_CLASS} resize-none`}
                  />
                </div>

                <button
                  type="submit"
                  disabled={sending}
                  className="group mt-2 inline-flex items-center gap-2 self-start bg-copper-gradient px-7 py-4 text-eyebrow font-semibold uppercase tracking-eyebrow text-hodex-white transition-all duration-300 hover:-translate-y-px hover:shadow-[0_10px_30px_rgba(180,56,1,0.35)] disabled:cursor-wait disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none"
                >
                  {sending ? 'Enviando…' : 'Enviar mensaje'}
                  <span className="transition-transform duration-300 group-hover:translate-x-1">
                    &rarr;
                  </span>
                </button>

                {error && (
                  <p role="alert" className="m-0 text-small text-hodex-white/70">
                    {error}
                  </p>
                )}
              </form>
            </Reveal>
          </div>
        )}
      </div>
    </section>
  )
}
