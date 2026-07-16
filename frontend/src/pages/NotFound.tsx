import { useEffect } from 'react'
import { Link } from 'react-router-dom'

/** 404 on-brand: fondo negro, wordmark metálico, enlace de vuelta. */
export default function NotFound() {
  useEffect(() => {
    document.title = 'Página no encontrada — Hodex'
    return () => {
      document.title = 'Hodex — Automatización con IA y productos web a medida'
    }
  }, [])

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-hodex-black px-6 text-center text-hodex-white">
      <div className="text-eyebrow uppercase tracking-eyebrow text-hodex-white/55">
        Error 404
      </div>
      <h1 className="mt-6 font-display text-h1 font-extralight tracking-wordmark text-metallic">
        Página no encontrada
      </h1>
      <p className="mt-6 max-w-[440px] leading-body text-hodex-white/55">
        La página que buscas no existe o ha cambiado de dirección.
      </p>
      <Link
        to="/"
        className="mt-10 inline-flex items-center gap-2 border border-hodex-line-dark px-7 py-4 text-eyebrow uppercase tracking-eyebrow text-hodex-white transition-colors duration-300 hover:border-hodex-white"
      >
        &larr; Volver al inicio
      </Link>
    </main>
  )
}
