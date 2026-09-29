/**
 * Botones de marca:
 * - `primary`: cobre. UNO por pantalla como máximo, solo la acción principal.
 * - `dark`: negro sobre claro (acciones persistentes, nunca cobre).
 * - `outline`: secundario sobre claro.
 * - `outline-dark`: secundario sobre negro.
 */
export type ButtonVariant = 'primary' | 'dark' | 'outline' | 'outline-dark'

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-copper-gradient text-hodex-white hover:brightness-110',
  dark: 'bg-hodex-black text-hodex-white hover:bg-hodex-black/85',
  outline:
    'border border-hodex-black bg-hodex-white text-hodex-black hover:bg-hodex-black hover:text-hodex-white',
  'outline-dark':
    'border border-hodex-line-dark bg-transparent text-hodex-white hover:border-hodex-white',
}

/**
 * Clases de botón, compartidas por <Button> y <LinkButton>. En carga el botón
 * conserva su color (el cobre no se decolora): solo cambia texto y cursor.
 */
export function buttonClasses(variant: ButtonVariant, fullWidth = false): string {
  return `inline-flex items-center justify-center px-7 py-4 font-body text-small font-semibold uppercase tracking-[0.04em] transition-all duration-300 aria-busy:cursor-wait disabled:cursor-not-allowed disabled:[&:not([aria-busy])]:opacity-40 ${
    VARIANTS[variant]
  } ${fullWidth ? 'w-full' : ''}`
}
