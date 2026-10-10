import { Link } from 'react-router-dom'
import { SERVICES } from '../content/services'
import Reveal from './Reveal'

/**
 * Services — los tres servicios como tarjetas hairline (tratamiento "trust
 * card": caja de 1px, índice en caja, título display, descripción gris).
 * Cada tarjeta entera enlaza a la página del servicio. Monocroma: el cobre
 * solo asoma en el underline del enlace al pasar por encima.
 */
export default function Services({
  headingLevel = 'h2',
  index = '02',
  showIntro = true,
}: {
  /** En la página /servicios el h1 está en la cabecera: aquí van h2/h3. */
  headingLevel?: 'h2' | 'h3'
  index?: string
  showIntro?: boolean
}) {
  const Heading = headingLevel

  return (
    <section id="servicios" className="border-b border-hodex-line py-24 md:py-32">
      <div className="mx-auto max-w-[1320px] px-6">
        {showIntro && (
          <Reveal>
            <div className="flex items-center gap-4 text-eyebrow uppercase tracking-eyebrow text-hodex-gray">
              Servicios
              <span className="h-px max-w-[220px] flex-1 bg-hodex-line" />
              <span className="text-hodex-gray-light">{index}</span>
            </div>
            <Heading className="mt-6 font-display text-h2 font-light leading-tight tracking-headline">
              Qué hacemos
            </Heading>
            <p className="mt-6 max-w-[640px] text-body-lg leading-body">
              <b className="font-semibold text-hodex-black">Un mismo equipo para todo.</b>{' '}
              <span className="text-hodex-gray">
                Webs que transmiten lo que eres, aplicaciones que hacen funcionar tu negocio e
                inteligencia artificial que atiende a tus clientes y te quita trabajo repetitivo.
              </span>
            </p>
          </Reveal>
        )}

        <div className={`grid gap-2 md:grid-cols-2 xl:grid-cols-4 ${showIntro ? 'mt-14 md:mt-20' : ''}`}>
          {SERVICES.map((service, i) => (
            <Reveal key={service.slug} delay={i * 80} className="h-full">
              <Link
                to={`/servicios/${service.slug}`}
                className="group relative flex h-full flex-col border border-hodex-line p-6 transition-all duration-300 ease-out hover:-translate-y-1 hover:border-hodex-black/30 hover:shadow-[0_12px_40px_rgba(17,16,16,0.08)] md:p-8"
              >
                <span className="absolute right-4 top-4 border border-hodex-line px-2 py-0.5 text-[11px] text-hodex-gray">
                  {service.index}/
                </span>
                <h3 className="max-w-[calc(100%-56px)] font-display text-[22px] font-light leading-tight tracking-headline">
                  {service.name}
                </h3>
                <p className="mt-4 flex-1 text-small leading-body text-hodex-gray">{service.summary}</p>
                <ul className="mt-6 flex list-none flex-col gap-2 border-t border-hodex-line p-0 pt-5">
                  {service.includes.slice(0, 3).map((item) => (
                    <li key={item.title} className="flex gap-3 text-small text-hodex-black">
                      <span aria-hidden="true" className="text-hodex-gray-light">
                        ↳
                      </span>
                      {item.title}
                    </li>
                  ))}
                </ul>
                <span className="relative mt-8 inline-flex items-center gap-2 self-start text-eyebrow uppercase tracking-eyebrow text-hodex-black">
                  Ver servicio
                  <span aria-hidden="true" className="transition-transform duration-300 ease-out group-hover:translate-x-1">
                    &rarr;
                  </span>
                  <span className="absolute -bottom-2 left-0 h-px w-full origin-left scale-x-0 bg-copper-gradient transition-transform duration-300 ease-out group-hover:scale-x-100" />
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
