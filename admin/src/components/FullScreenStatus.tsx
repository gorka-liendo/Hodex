import { Isotype } from './brand'
import { Button } from './Button'

/** Pantalla completa de espera o error (antes de saber si hay sesión). */
export function FullScreenStatus({
  message,
  onRetry,
}: {
  message: string
  onRetry?: () => void
}) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-8 bg-hodex-black px-6 text-hodex-white">
      <Isotype className="h-10 w-auto motion-safe:animate-pulse" />
      <p role="status" className="text-small text-hodex-white/55">
        {message}
      </p>
      {onRetry && (
        <Button variant="outline-dark" onClick={onRetry}>
          Reintentar
        </Button>
      )}
    </main>
  )
}
