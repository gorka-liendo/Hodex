import type { ReactNode } from 'react'
import { ApiError } from '../api/client'
import { IndexBox } from './brand'
import { Button } from './Button'

/** Pestañas de filtro: texto en mayúsculas espaciadas con subrayado hairline. */
export function FilterTabs<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: Array<{ value: T; label: string }>
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-x-8 gap-y-2">
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={`relative py-2 text-eyebrow uppercase tracking-eyebrow transition-colors duration-300 ${
              active ? 'text-hodex-black' : 'text-hodex-gray hover:text-hodex-black'
            }`}
          >
            {option.label}
            <span
              aria-hidden="true"
              className={`absolute inset-x-0 -bottom-px h-px origin-left bg-hodex-black transition-transform duration-300 ${
                active ? 'scale-x-100' : 'scale-x-0'
              }`}
            />
          </button>
        )
      })}
    </div>
  )
}

/** Paginación sobria: "1–25 de 80" + anterior / siguiente. */
export function Pagination({
  page,
  pageSize,
  total,
  onChange,
}: {
  page: number
  pageSize: number
  total: number
  onChange: (page: number) => void
}) {
  if (total <= pageSize) return null
  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)
  const lastPage = Math.ceil(total / pageSize)
  const linkClass =
    'text-small text-hodex-gray underline-offset-4 transition-colors hover:text-hodex-black hover:underline disabled:pointer-events-none disabled:opacity-30'

  return (
    <nav aria-label="Paginación" className="flex items-center justify-between pt-6 text-small">
      <span className="text-hodex-gray tabular-nums">
        {from}–{to} de {total}
      </span>
      <div className="flex gap-6">
        <button type="button" className={linkClass} disabled={page <= 1} onClick={() => onChange(page - 1)}>
          ← Anterior
        </button>
        <button
          type="button"
          className={linkClass}
          disabled={page >= lastPage}
          onClick={() => onChange(page + 1)}
        >
          Siguiente →
        </button>
      </div>
    </nav>
  )
}

/** Estado vacío con índice en caja, mensaje y acción opcional. */
export function EmptyState({
  title,
  children,
  action,
}: {
  title: string
  children?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-start gap-5 border border-hodex-line bg-hodex-white p-8 md:p-12">
      <IndexBox>00/</IndexBox>
      <p className="font-display text-h3 leading-tight font-light">{title}</p>
      {children && <p className="max-w-[560px] text-hodex-gray">{children}</p>}
      {action}
    </div>
  )
}

/** Carga o error de una consulta, con reintento. */
export function QueryStatus({ error, onRetry }: { error?: unknown; onRetry?: () => void }) {
  if (!error) {
    return (
      <p role="status" className="py-16 text-center text-small text-hodex-gray">
        Cargando…
      </p>
    )
  }
  const message = error instanceof ApiError ? error.message : 'No se pudieron cargar los datos.'
  return (
    <div role="alert" className="flex flex-col items-start gap-4 border-l border-hodex-black py-2 pl-4">
      <p className="font-medium">{message}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          Reintentar
        </Button>
      )}
    </div>
  )
}
