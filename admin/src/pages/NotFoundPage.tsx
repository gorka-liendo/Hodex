import { Link } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'

export function NotFoundPage() {
  return (
    <div className="flex flex-col gap-10">
      <PageHeader eyebrow="404" title="Página no encontrada" description="Esta sección no existe." />
      <Link
        to="/"
        className="self-start text-small text-hodex-gray underline-offset-4 transition-colors hover:text-hodex-black hover:underline"
      >
        ← Volver al resumen
      </Link>
    </div>
  )
}
