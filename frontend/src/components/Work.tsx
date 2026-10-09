import { Link } from 'react-router-dom'
import { PROJECTS, type Project } from '../content/projects'
import BrowserMock from './BrowserMock'
import Reveal from './Reveal'

/**
 * Work — proyectos. Filas editoriales grandes en zigzag alternado, fiel al
 * design system: índice numerado, eyebrow, Helvetica light, hairlines.
 * El único cobre aparece en el underline del enlace SOLO en hover (regla
 * "cobre 1× por pantalla"): en reposo la sección es 100% monocroma.
 * Cada proyecto enlaza a su caso (/proyectos/<slug>) y, aparte, a su web.
 */

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
            <span className="text-eyebrow uppercase tracking-eyebrow text-hodex-gray">{project.discipline}</span>
          </div>

          <h3 className="mt-6 font-display text-4xl font-light leading-tight tracking-headline md:text-h2">
            <Link to={`/proyectos/${project.slug}`} className="transition-opacity duration-300 hover:opacity-70">
              {project.name}
            </Link>
          </h3>
          <p className="mt-3 font-body text-body-lg text-hodex-gray">{project.tagline}</p>
          <p className="mt-5 max-w-md leading-body text-hodex-gray">{project.description}</p>

          <div className="mt-7 flex flex-wrap gap-2">
            {project.tags.map((tag) => (
              <span key={tag} className="border border-hodex-line px-3 py-1 text-small text-hodex-gray">
                {tag}
              </span>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
              <Link
                to={`/proyectos/${project.slug}`}
                className="relative inline-flex items-center gap-2 text-eyebrow uppercase tracking-eyebrow text-hodex-black"
              >
                Ver el proyecto
                <span className="transition-transform duration-300 ease-out group-hover:translate-x-1">&rarr;</span>
                {/* underline cobre — único acento de color, solo en hover */}
                <span className="absolute -bottom-2 left-0 h-px w-full origin-left scale-x-0 bg-copper-gradient transition-transform duration-300 ease-out group-hover:scale-x-100" />
              </Link>
              <a
                href={project.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-small text-hodex-gray underline-offset-4 transition-colors duration-300 hover:text-hodex-black hover:underline"
              >
                {project.domain} ↗
              </a>
            </div>
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

export default function Work({
  projects = PROJECTS,
  eyebrow = 'Proyectos seleccionados',
  title = 'Proyectos',
  intro = 'Dos productos ambiciosos, ambos potenciados por inteligencia artificial. Construidos de principio a fin con precisión y sin ruido.',
  index = '04',
  id = 'work',
}: {
  projects?: Project[]
  eyebrow?: string
  title?: string
  intro?: string
  index?: string
  id?: string
}) {
  return (
    <section id={id} className="border-b border-hodex-line py-24 md:py-32">
      <div className="mx-auto max-w-[1320px] px-6">
        <Reveal>
          <div className="flex items-center gap-4 text-eyebrow uppercase tracking-eyebrow text-hodex-gray">
            {eyebrow}
            <span className="h-px max-w-[220px] flex-1 bg-hodex-line" />
            <span className="text-hodex-gray-light">{index}</span>
          </div>
          <h2 className="mt-6 font-display text-h2 font-light leading-tight tracking-headline">{title}</h2>
          <p className="mt-4 max-w-[600px] leading-body text-hodex-gray">{intro}</p>
        </Reveal>

        <div className="mt-14 md:mt-20">
          {projects.map((project, i) => (
            <Reveal key={project.slug} delay={i * 120}>
              <ProjectRow project={project} reverse={i % 2 === 1} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
