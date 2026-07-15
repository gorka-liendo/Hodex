import Reveal from './Reveal'

/**
 * Work — sección "Selected work". Filas editoriales grandes en zigzag alternado,
 * fiel al design system: índice numerado, eyebrow, Helvetica light, hairlines.
 * El único cobre aparece en el underline del enlace SOLO en hover (regla
 * "cobre 1× por pantalla"): en reposo la sección es 100% monocroma.
 *
 * NOTA: copy provisional basada en el tagline real de cada sitio. A refinar.
 */

type Project = {
  index: string
  name: string
  domain: string
  href: string
  discipline: string
  tagline: string
  description: string
  tags: string[]
  status: string
}

const PROJECTS: Project[] = [
  {
    index: '01',
    name: 'GoLink',
    domain: 'golink.es',
    href: 'https://golink.es',
    discipline: 'IA · Creator economy',
    tagline: 'El método de los creadores que sigues.',
    description:
      'Plataforma potenciada por IA para la economía de creadores: convierte audiencia en producto, unificando enlaces, contenido y monetización en un solo flujo inteligente.',
    tags: ['IA', 'Creators', 'SaaS'],
    status: '2026 — En desarrollo',
  },
  {
    index: '02',
    name: 'MyTrainerHub',
    domain: 'mytrainerhub.es',
    href: 'https://mytrainerhub.es',
    discipline: 'IA · Fitness',
    tagline: 'El software del entrenador personal.',
    description:
      'Sistema todo-en-uno para entrenadores personales: planes, seguimiento de clientes y programación automatizados por IA para escalar su negocio sin perder el trato humano.',
    tags: ['IA', 'Fitness', 'SaaS'],
    status: '2026 — En desarrollo',
  },
]

function BrowserMock({ project }: { project: Project }) {
  return (
    <div className="overflow-hidden border border-hodex-line bg-hodex-off-white">
      {/* Barra del navegador — puntos cuadrados (radius 0, detalle de marca) */}
      <div className="flex items-center gap-1.5 border-b border-hodex-line px-4 py-3">
        <span className="h-2 w-2 bg-hodex-black/20" />
        <span className="h-2 w-2 bg-hodex-black/20" />
        <span className="h-2 w-2 bg-hodex-black/20" />
        <span className="ml-3 font-body text-[11px] tracking-wide text-hodex-gray">
          {project.domain}
        </span>
      </div>
      {/* Lienzo con el wordmark grabado, hace zoom al hover de la fila */}
      <div className="flex aspect-[16/10] items-center justify-center overflow-hidden bg-[linear-gradient(160deg,#d8d8d8,#f2f2f2)]">
        <span className="font-display text-4xl font-extralight uppercase tracking-wordmark text-hodex-black/25 transition-transform duration-700 ease-out group-hover:scale-110 md:text-5xl">
          {project.name}
        </span>
      </div>
    </div>
  )
}

function ProjectRow({ project, reverse }: { project: Project; reverse: boolean }) {
  return (
    <article className="group border-t border-hodex-line">
      <div className="grid items-center gap-8 py-12 md:grid-cols-2 md:gap-16 md:py-20">
        {/* Texto */}
        <div className={reverse ? 'md:order-2' : ''}>
          <div className="flex items-center gap-4">
            <span className="inline-flex h-8 w-10 items-center justify-center border border-hodex-line text-small text-hodex-black">
              {project.index}/
            </span>
            <span className="text-eyebrow uppercase tracking-eyebrow text-hodex-gray">
              {project.discipline}
            </span>
          </div>

          <h3 className="mt-6 font-display text-4xl font-light uppercase leading-tight tracking-headline md:text-h2">
            {project.name}
          </h3>
          <p className="mt-3 font-body text-body-lg text-hodex-gray">
            {project.tagline}
          </p>
          <p className="mt-5 max-w-md leading-body text-hodex-gray">
            {project.description}
          </p>

          <div className="mt-7 flex flex-wrap gap-2">
            {project.tags.map((tag) => (
              <span
                key={tag}
                className="border border-hodex-line px-3 py-1 text-small text-hodex-gray"
              >
                {tag}
              </span>
            ))}
          </div>

          <div className="mt-8 flex items-center justify-between gap-4">
            <a
              href={project.href}
              target="_blank"
              rel="noopener noreferrer"
              className="relative inline-flex items-center gap-2 text-eyebrow uppercase tracking-eyebrow text-hodex-black"
            >
              Visit {project.domain}
              <span className="transition-transform duration-300 ease-out group-hover:translate-x-1">
                &rarr;
              </span>
              {/* underline cobre — único acento de color, solo en hover */}
              <span className="absolute -bottom-2 left-0 h-px w-full origin-left scale-x-0 bg-copper-gradient transition-transform duration-300 ease-out group-hover:scale-x-100" />
            </a>
            <span className="text-small text-hodex-gray-light">{project.status}</span>
          </div>
        </div>

        {/* Visual */}
        <div className={reverse ? 'md:order-1' : ''}>
          <BrowserMock project={project} />
        </div>
      </div>
    </article>
  )
}

export default function Work() {
  return (
    <section id="work" className="border-b border-hodex-line py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <div className="flex items-center gap-4 text-eyebrow uppercase tracking-eyebrow text-hodex-gray">
            Selected work
            <span className="h-px max-w-[220px] flex-1 bg-hodex-line" />
            <span className="text-hodex-gray-light">02</span>
          </div>
          <h2 className="mt-6 font-display text-h2 font-light leading-tight tracking-headline">
            Proyectos
          </h2>
          <p className="mt-4 max-w-[600px] leading-body text-hodex-gray">
            Dos productos ambiciosos, ambos potenciados por inteligencia artificial.
            Construidos de principio a fin con precisión y sin ruido.
          </p>
        </Reveal>

        <div className="mt-14 md:mt-20">
          {PROJECTS.map((project, i) => (
            <Reveal key={project.domain} delay={i * 120}>
              <ProjectRow project={project} reverse={i % 2 === 1} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
