import type { ButtonHTMLAttributes } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import { buttonClasses, type ButtonVariant } from './buttonStyles'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
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
      className={`${buttonClasses(variant, fullWidth)} ${className}`}
      {...rest}
    >
      {loading && loadingLabel ? loadingLabel : children}
    </button>
  )
}

/** Enlace de navegación con aspecto de botón. */
export function LinkButton({
  variant = 'dark',
  className = '',
  ...rest
}: LinkProps & { variant?: ButtonVariant }) {
  return <Link className={`${buttonClasses(variant)} ${className}`} {...rest} />
}
