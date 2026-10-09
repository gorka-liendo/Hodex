import { Link } from 'react-router-dom'
import type { Project } from '../content/projects'

/**
 * Captura real de la landing de un proyecto dentro de un marco de navegador
 * (puntos cuadrados: radius 0, detalle de marca). Toda la "pantalla" es
 * clicable: lleva al caso en Hodex o, si se pide, a la web del proyecto.
 */
export default function BrowserMock({
  project,
  to = 'case',
  eager = false,
}: {
  project: Project
  /** 'case' → /proyectos/<slug>; 'site' → la web del proyecto. */
  to?: 'case' | 'site'
  /** En la cabecera de un caso la imagen se ve nada más entrar: sin lazy. */
  eager?: boolean
}) {
  const className =
    'block overflow-hidden border border-hodex-line bg-hodex-off-white transition-shadow duration-500 hover:shadow-[0_16px_50px_rgba(17,16,16,0.12)]'
  const content = (
    <>
      <div className="flex items-center gap-1.5 border-b border-hodex-line px-4 py-3">
        <span className="h-2 w-2 bg-hodex-black/20" />
        <span className="h-2 w-2 bg-hodex-black/20" />
        <span className="h-2 w-2 bg-hodex-black/20" />
        <span className="ml-3 font-body text-[11px] tracking-wide text-hodex-gray">{project.domain}</span>
      </div>
      {/* Hace zoom sutil al hover de la fila (group) */}
      <div className="aspect-[16/10] overflow-hidden bg-hodex-black">
        <img
          src={project.image}
          alt={`Web de ${project.name}`}
          width={1200}
          height={750}
          loading={eager ? 'eager' : 'lazy'}
          className="h-full w-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-105"
        />
      </div>
    </>
  )

  return to === 'site' ? (
    <a href={project.href} target="_blank" rel="noopener noreferrer" aria-label={`Visitar ${project.domain}`} className={className}>
      {content}
    </a>
  ) : (
    <Link to={`/proyectos/${project.slug}`} aria-label={`Ver el proyecto ${project.name}`} className={className}>
      {content}
    </Link>
  )
}
