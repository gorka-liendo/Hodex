import { Link, useParams } from 'react-router-dom'
import BrowserMock from '../components/BrowserMock'
import PageLayout, { ClosingCta, PageHero, SectionEyebrow } from '../components/PageLayout'
import Reveal from '../components/Reveal'
import { findProject, PROJECTS } from '../content/projects'
import { findService, type Service } from '../content/services'
import NotFound from './NotFound'

/** Caso de un proyecto: /proyectos/<slug>. */
export default function ProjectPage() {
  const { slug = '' } = useParams()
  const project = findProject(slug)
  if (!project) return <NotFound />

  const services = project.services.map(findService).filter((s): s is Service => Boolean(s))
  // "Software para X: hace Y" → frase destacada + resto, ambas con mayúscula.
  const [first, ...restParts] = project.description.split(':')
  const rest = restParts.join(':').trim()
  const lead = { strong: `${first}.`, rest: rest.charAt(0).toUpperCase() + rest.slice(1) }
  const next = PROJECTS[(PROJECTS.indexOf(project) + 1) % PROJECTS.length]!

  return (
    <PageLayout>
      <PageHero
        crumbs={[
          { name: 'Inicio', to: '/' },
          { name: project.name, to: `/proyectos/${project.slug}` },
        ]}
        eyebrow={`Proyecto ${project.index} · ${project.discipline}`}
        title={`${project.name}. ${project.tagline}`}
        lead={lead}
        ghost={project.index}
      >
        <Reveal delay={150}>
          <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
            <a
              href={project.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border border-hodex-line-dark px-7 py-4 text-eyebrow uppercase tracking-eyebrow text-hodex-white transition-colors duration-300 hover:border-hodex-white"
            >
              Visitar {project.domain}
              <span aria-hidden="true">↗</span>
            </a>
            <span className="text-small text-hodex-white/50">{project.status}</span>
          </div>
        </Reveal>
      </PageHero>

      {/* ===== Captura ===== */}
      <section className="border-b border-hodex-line bg-hodex-off-white py-16 md:py-24">
        <div className="group mx-auto max-w-[1100px] px-6">
          <Reveal>
            <BrowserMock project={project} to="site" eager />
          </Reveal>
        </div>
      </section>

      {/* ===== El reto ===== */}
      <section className="border-b border-hodex-line py-24 md:py-32">
        <div className="mx-auto grid max-w-[1320px] gap-12 px-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] md:gap-16">
          <Reveal>
            <SectionEyebrow index="01">El reto</SectionEyebrow>
            <h2 className="mt-6 font-display text-h2 font-light leading-tight tracking-headline">Por qué existe</h2>
          </Reveal>
          <Reveal delay={120}>
            <p className="m-0 font-display text-[22px] font-light leading-[1.45] md:text-h3 md:leading-[1.35]">{project.challenge}</p>
          </Reveal>
        </div>
      </section>

      {/* ===== Lo que construimos ===== */}
      <section className="border-b border-hodex-line py-24 md:py-32">
        <div className="mx-auto max-w-[1320px] px-6">
          <Reveal>
            <SectionEyebrow index="02">Lo que construimos</SectionEyebrow>
            <h2 className="mt-6 font-display text-h2 font-light leading-tight tracking-headline">El producto</h2>
          </Reveal>
          <div className="mt-14 grid gap-2 md:mt-20 md:grid-cols-2">
            {project.built.map((item, i) => (
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

      {/* ===== Tecnología y servicios ===== */}
      <section className="border-b border-hodex-line py-24 md:py-32">
        <div className="mx-auto grid max-w-[1320px] gap-16 px-6 md:grid-cols-2">
          <Reveal>
            <SectionEyebrow index="03">Tecnología</SectionEyebrow>
            <ul className="mt-8 flex list-none flex-wrap gap-2 p-0">
              {project.stack.map((item) => (
                <li key={item} className="border border-hodex-line px-4 py-2 text-small text-hodex-black">
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={120}>
            <SectionEyebrow index="04">Servicios</SectionEyebrow>
            <ul className="mt-8 list-none border-t border-hodex-line p-0">
              {services.map((s) => (
                <li key={s.slug} className="border-b border-hodex-line">
                  <Link to={`/servicios/${s.slug}`} className="group flex items-center justify-between gap-6 py-5">
                    <span className="font-display text-[20px] font-light">{s.name}</span>
                    <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1">
                      &rarr;
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* ===== Siguiente proyecto ===== */}
      {next.slug !== project.slug && (
        <section className="py-20 md:py-24">
          <div className="mx-auto max-w-[1320px] px-6">
            <SectionEyebrow>Siguiente proyecto</SectionEyebrow>
            <Link
              to={`/proyectos/${next.slug}`}
              className="group mt-8 flex items-center justify-between gap-6 border-t border-hodex-line pt-8"
            >
              <span>
                <span className="block font-display text-4xl font-light leading-tight tracking-headline md:text-h1">{next.name}</span>
                <span className="mt-3 block text-body-lg text-hodex-gray">{next.tagline}</span>
              </span>
              <span aria-hidden="true" className="text-h3 transition-transform duration-300 group-hover:translate-x-2">
                &rarr;
              </span>
            </Link>
          </div>
        </section>
      )}

      <ClosingCta
        title="¿Tienes un producto en mente?"
        text="Lo diseñamos y lo construimos contigo, por fases y con un presupuesto cerrado desde el principio."
      />
    </PageLayout>
  )
}
