import Reveal from './Reveal'
import golinkImg from '../assets/golink.jpg'
import mytrainerhubImg from '../assets/mytrainerhub.jpg'

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
  image: string
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
      'Marketplace de creadores: guías, plantillas, cursos y planes de fitness, viajes, finanzas y muchos nichos más. Se compra una vez y es tuyo para siempre.',
    tags: ['IA', 'Marketplace', 'Creators'],
    status: '2026 — En desarrollo',
    image: golinkImg,
  },
  {
    index: '02',
    name: 'MyTrainerHub',
    domain: 'mytrainerhub.es',
    href: 'https://mytrainerhub.es',
    discipline: 'IA · Fitness',
    tagline: 'Menos Excel. Más resultados.',
    description:
      'Software para entrenadores personales: sustituye el caos de las hojas de cálculo por planes, seguimiento de clientes y automatización con IA, sin perder el trato humano.',
    tags: ['IA', 'Fitness', 'SaaS'],
    status: '2026 — En desarrollo',
    image: mytrainerhubImg,
  },
]

function BrowserMock({ project }: { project: Project }) {
  return (
    /* Toda la "pantalla" es clicable y lleva al proyecto, igual que el enlace de texto */
    <a
      href={project.href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Visitar ${project.domain}`}
      className="block overflow-hidden border border-hodex-line bg-hodex-off-white transition-shadow duration-500 hover:shadow-[0_16px_50px_rgba(17,16,16,0.12)]">
      {/* Barra del navegador — puntos cuadrados (radius 0, detalle de marca) */}
      <div className="flex items-center gap-1.5 border-b border-hodex-line px-4 py-3">
        <span className="h-2 w-2 bg-hodex-black/20" />
        <span className="h-2 w-2 bg-hodex-black/20" />
        <span className="h-2 w-2 bg-hodex-black/20" />
        <span className="ml-3 font-body text-[11px] tracking-wide text-hodex-gray">
          {project.domain}
        </span>
      </div>
      {/* Captura real de la landing, hace zoom sutil al hover de la fila */}
      <div className="aspect-[16/10] overflow-hidden bg-hodex-black">
        <img
          src={project.image}
          alt={`Landing de ${project.name}`}
          loading="lazy"
          className="h-full w-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-105"
        />
      </div>
    </a>
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

          <h3 className="mt-6 font-display text-4xl font-light leading-tight tracking-headline md:text-h2">
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
      <div className="mx-auto max-w-[1320px] px-6">
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
