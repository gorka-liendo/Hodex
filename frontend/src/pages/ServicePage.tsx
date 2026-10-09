import { Link, useParams } from 'react-router-dom'
import Faq from '../components/Faq'
import PageLayout, { ClosingCta, PageHero, SectionEyebrow } from '../components/PageLayout'
import Process from '../components/Process'
import Reveal from '../components/Reveal'
import Work from '../components/Work'
import { findProject, type Project } from '../content/projects'
import { findService, SERVICES } from '../content/services'
import NotFound from './NotFound'

/** Página de un servicio: /servicios/<slug>. */
export default function ServicePage() {
  const { slug = '' } = useParams()
  const service = findService(slug)
  if (!service) return <NotFound />

  // "Automatización con IA" → "automatización con IA" (no rompe las siglas).
  const nameInText = service.name.charAt(0).toLowerCase() + service.name.slice(1)
  const projects = service.projects.map(findProject).filter((p): p is Project => Boolean(p))
  const others = SERVICES.filter((s) => s.slug !== service.slug)

  return (
    <PageLayout>
      <PageHero
        crumbs={[
          { name: 'Inicio', to: '/' },
          { name: 'Servicios', to: '/servicios' },
          { name: service.name, to: `/servicios/${service.slug}` },
        ]}
        eyebrow={`Servicio ${service.index}`}
        title={service.title}
        lead={service.lead}
        cta={{ label: 'Pide presupuesto', to: '/contacto' }}
        ghost={service.index}
      />

      {/* ===== Qué incluye ===== */}
      <section className="border-b border-hodex-line py-24 md:py-32">
        <div className="mx-auto max-w-[1320px] px-6">
          <Reveal>
            <SectionEyebrow index="01">Qué incluye</SectionEyebrow>
            <h2 className="mt-6 font-display text-h2 font-light leading-tight tracking-headline">Todo lo necesario, bien hecho</h2>
          </Reveal>
          <div className="mt-14 grid gap-2 md:mt-20 md:grid-cols-2">
            {service.includes.map((item, i) => (
              <Reveal key={item.title} delay={i * 80} className="h-full">
                <article className="relative h-full border border-hodex-line p-6 md:p-8">
                  <span className="absolute right-4 top-4 border border-hodex-line px-2 py-0.5 text-[11px] text-hodex-gray">
                    {String(i + 1).padStart(2, '0')}/
                  </span>
                  <h3 className="max-w-[calc(100%-56px)] font-display text-lg font-light uppercase tracking-headline">{item.title}</h3>
                  <p className="mt-3 max-w-md text-small leading-body text-hodex-gray">{item.desc}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Para quién ===== */}
      <section className="border-b border-hodex-line py-24 md:py-32">
        <div className="mx-auto grid max-w-[1320px] gap-12 px-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] md:gap-16">
          <Reveal>
            <SectionEyebrow index="02">Para quién</SectionEyebrow>
            <h2 className="mt-6 font-display text-h2 font-light leading-tight tracking-headline">¿Es para ti?</h2>
            <p className="mt-6 max-w-[420px] leading-body text-hodex-gray">
              Si te reconoces en alguno de estos casos, hablemos. La primera llamada es gratuita y sin compromiso.
            </p>
          </Reveal>
          <Reveal delay={120}>
            <ul className="m-0 list-none border-t border-hodex-line p-0">
              {service.forWho.map((item) => (
                <li key={item} className="flex gap-5 border-b border-hodex-line py-6">
                  <span aria-hidden="true" className="text-xl text-hodex-gray-light">
                    ↳
                  </span>
                  <span className="font-display text-[20px] font-light leading-[1.35] md:text-[22px]">{item}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      <Process index="03" />

      {projects.length > 0 && (
        <Work
          projects={projects}
          eyebrow="Proyectos"
          title="Lo hemos hecho antes"
          intro="Productos que hemos diseñado y construido de principio a fin."
          index="04"
          id="proyectos"
        />
      )}

      <Faq faqs={service.faqs} title={`Preguntas sobre ${nameInText}`} index="05" id="preguntas" />

      {/* ===== Otros servicios ===== */}
      <section className="py-20 md:py-24">
        <div className="mx-auto max-w-[1320px] px-6">
          <SectionEyebrow>También hacemos</SectionEyebrow>
          <ul className="mt-8 grid list-none gap-2 p-0 md:grid-cols-2">
            {others.map((s) => (
              <li key={s.slug}>
                <Link
                  to={`/servicios/${s.slug}`}
                  className="group flex h-full items-center justify-between gap-6 border border-hodex-line p-6 transition-all duration-300 hover:border-hodex-black/30 hover:shadow-[0_12px_40px_rgba(17,16,16,0.08)]"
                >
                  <span>
                    <span className="block font-display text-[22px] font-light leading-tight tracking-headline">{s.name}</span>
                    <span className="mt-2 block text-small leading-body text-hodex-gray">{s.summary}</span>
                  </span>
                  <span aria-hidden="true" className="shrink-0 transition-transform duration-300 group-hover:translate-x-1">
                    &rarr;
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <ClosingCta
        title={`¿Hablamos de tu proyecto de ${nameInText}?`}
        text="Cuéntanos qué necesitas. Te respondemos con una propuesta clara, un plan por fases y un presupuesto cerrado."
      />
    </PageLayout>
  )
}
