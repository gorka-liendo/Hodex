import type { ReactNode } from 'react'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { Eyebrow } from './brand'

/**
 * Cabecera de cada pantalla del panel: eyebrow + título display fino. También
 * fija el título de la pestaña del navegador.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string
  title: string
  description?: ReactNode
  /** Acción principal de la pantalla (aquí va el único botón cobre). */
  actions?: ReactNode
}) {
  useDocumentTitle(title)

  return (
    <header className="flex flex-col gap-6 border-b border-hodex-line pb-10 md:flex-row md:items-end md:justify-between">
      <div className="flex flex-col gap-5">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className="font-display text-[40px] leading-tight font-light tracking-headline md:text-h1">
          {title}
        </h1>
        {description && (
          <p className="max-w-[640px] text-body-lg leading-body text-hodex-gray">{description}</p>
        )}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </header>
  )
}
