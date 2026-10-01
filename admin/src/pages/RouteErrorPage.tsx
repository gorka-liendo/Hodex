import { Link, useRouteError } from 'react-router-dom'
import { Isotype } from '../components/brand'

/**
 * Error inesperado al pintar una pantalla. Sustituye a la página de error por
 * defecto de React Router: mensaje de marca y sin detalles técnicos en pantalla
 * (el detalle queda en la consola del navegador para depurar).
 */
export function RouteErrorPage() {
  const error = useRouteError()
  console.error(error)

  return (
    <main className="flex min-h-svh flex-col items-start justify-center gap-8 bg-hodex-off-white px-6 md:px-16">
      <Isotype className="h-8 w-auto text-hodex-black" />
      <div className="flex flex-col gap-4">
        <span className="text-eyebrow uppercase tracking-eyebrow text-hodex-gray">Error</span>
        <h1 className="font-display text-h2 leading-tight font-light">Algo no ha ido bien</h1>
        <p className="max-w-[520px] text-hodex-gray">
          Esta pantalla ha fallado al cargar. Tus datos no se han modificado. Prueba a recargar o
          vuelve al resumen.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-8 text-small">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="bg-hodex-black px-7 py-4 font-semibold uppercase tracking-[0.04em] text-hodex-white transition-colors hover:bg-hodex-black/85"
        >
          Recargar
        </button>
        <Link to="/" className="text-hodex-gray underline-offset-4 hover:text-hodex-black hover:underline">
          Volver al resumen
        </Link>
      </div>
    </main>
  )
}
