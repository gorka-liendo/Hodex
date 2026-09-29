import type { ButtonHTMLAttributes } from 'react'

/**
 * Botones de marca:
 * - `primary`: cobre. UNO por pantalla como máximo, solo la acción principal.
 * - `dark`: negro sobre claro (acciones persistentes, nunca cobre).
 * - `outline`: secundario sobre claro.
 * - `outline-dark`: secundario sobre negro.
 */
type Variant = 'primary' | 'dark' | 'outline' | 'outline-dark'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-copper-gradient text-hodex-white hover:brightness-110',
  dark: 'bg-hodex-black text-hodex-white hover:bg-hodex-black/85',
  outline:
    'border border-hodex-black bg-hodex-white text-hodex-black hover:bg-hodex-black hover:text-hodex-white',
  'outline-dark':
    'border border-hodex-line-dark bg-transparent text-hodex-white hover:border-hodex-white',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  /** Muestra `loadingLabel` y bloquea el botón mientras hay una petición en curso. */
  loading?: boolean
  loadingLabel?: string
  fullWidth?: boolean
}

export function Button({
  variant = 'dark',
  loading = false,
  loadingLabel,
  fullWidth = false,
  disabled,
  children,
  className = '',
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      // En carga el botón conserva su color (el cobre no se decolora): solo
      // cambia el texto y el cursor. `disabled` real, sin carga, sí se atenúa.
      className={`inline-flex items-center justify-center px-7 py-4 font-body text-small font-semibold uppercase tracking-[0.04em] transition-all duration-300 aria-busy:cursor-wait disabled:cursor-not-allowed disabled:[&:not([aria-busy])]:opacity-40 ${
        VARIANTS[variant]
      } ${fullWidth ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {loading && loadingLabel ? loadingLabel : children}
    </button>
  )
}
