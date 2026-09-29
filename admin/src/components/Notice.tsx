import type { ReactNode } from 'react'

/**
 * Mensaje en línea (error o aviso). Sin rojos ni verdes: la marca solo tiene
 * cuatro colores, así que el énfasis se da con peso y una hairline lateral.
 * `role="alert"` para que los lectores de pantalla lo anuncien al aparecer.
 */
export function Notice({
  children,
  tone = 'error',
}: {
  children: ReactNode
  tone?: 'error' | 'info'
}) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`border-l py-1 pl-4 text-small ${
        tone === 'error'
          ? 'border-hodex-black font-medium text-hodex-black'
          : 'border-hodex-line text-hodex-gray'
      }`}
    >
      {children}
    </div>
  )
}
