import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'

/**
 * Campos de formulario de la marca: sin caja, solo línea inferior (hairline que
 * pasa a negro al enfocar), etiqueta siempre visible y error bajo el campo.
 * El error se marca con peso y línea negra: la marca no tiene rojo.
 */

const CONTROL =
  'w-full border-0 border-b bg-transparent py-3 font-body text-hodex-black transition-colors duration-300 placeholder:text-hodex-gray-light focus:border-hodex-black focus:outline-none disabled:text-hodex-gray'

interface FieldShellProps {
  id: string
  label: string
  hint?: string
  error?: string
  optional?: boolean
  children: (a11y: { 'aria-invalid'?: true; 'aria-describedby'?: string; className: string }) => ReactNode
}

function FieldShell({ id, label, hint, error, optional, children }: FieldShellProps) {
  const messageId = error || hint ? `${id}-message` : undefined
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="flex items-baseline justify-between gap-4 text-small text-hodex-gray">
        {label}
        {optional && <span className="text-[11px] text-hodex-gray-light">Opcional</span>}
      </label>
      {children({
        'aria-invalid': error ? true : undefined,
        'aria-describedby': messageId,
        className: `${CONTROL} ${error ? 'border-hodex-black' : 'border-hodex-line'}`,
      })}
      {(error || hint) && (
        <p
          id={messageId}
          className={`text-small ${error ? 'font-medium text-hodex-black' : 'text-hodex-gray'}`}
        >
          {error ? `— ${error}` : hint}
        </p>
      )}
    </div>
  )
}

interface CommonProps {
  label: string
  hint?: string
  error?: string
  optional?: boolean
}

export function TextField({
  label,
  hint,
  error,
  optional,
  id,
  inputClassName = '',
  ...rest
}: CommonProps & InputHTMLAttributes<HTMLInputElement> & { inputClassName?: string }) {
  const autoId = useId()
  const inputId = id ?? autoId
  return (
    <FieldShell id={inputId} label={label} hint={hint} error={error} optional={optional}>
      {({ className, ...a11y }) => (
        <input id={inputId} className={`${className} ${inputClassName}`} {...a11y} {...rest} />
      )}
    </FieldShell>
  )
}

export function TextAreaField({
  label,
  hint,
  error,
  optional,
  id,
  ...rest
}: CommonProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const autoId = useId()
  const inputId = id ?? autoId
  return (
    <FieldShell id={inputId} label={label} hint={hint} error={error} optional={optional}>
      {({ className, ...a11y }) => (
        <textarea id={inputId} rows={4} className={`${className} resize-y`} {...a11y} {...rest} />
      )}
    </FieldShell>
  )
}

export function SelectField({
  label,
  hint,
  error,
  optional,
  id,
  options,
  ...rest
}: CommonProps &
  SelectHTMLAttributes<HTMLSelectElement> & { options: Array<{ value: string; label: string }> }) {
  const autoId = useId()
  const inputId = id ?? autoId
  return (
    <FieldShell id={inputId} label={label} hint={hint} error={error} optional={optional}>
      {({ className, ...a11y }) => (
        <select id={inputId} className={`${className} cursor-pointer`} {...a11y} {...rest}>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
    </FieldShell>
  )
}

/** Casilla de verificación cuadrada (radio 0), con check en negro. */
export function CheckboxField({
  label,
  description,
  id,
  ...rest
}: { label: string; description?: string } & Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const autoId = useId()
  const inputId = id ?? autoId
  return (
    <label
      htmlFor={inputId}
      className="flex cursor-pointer items-start gap-3 border border-hodex-line bg-hodex-white p-4 transition-colors hover:border-hodex-black has-checked:border-hodex-black"
    >
      {/* El check es un SVG en línea (no una imagen data:, que la CSP bloquea). */}
      <span className="relative mt-1 flex h-4 w-4 shrink-0">
        <input
          id={inputId}
          type="checkbox"
          className="peer h-4 w-4 cursor-pointer appearance-none border border-hodex-black bg-hodex-white checked:bg-hodex-black"
          {...rest}
        />
        <svg
          viewBox="0 0 10 8"
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 m-auto hidden h-2 w-2.5 text-hodex-white peer-checked:block"
        >
          <path d="M1 4l3 3 5-6" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </span>
      <span className="flex flex-col">
        <span className="text-hodex-black">{label}</span>
        {description && <span className="text-small text-hodex-gray">{description}</span>}
      </span>
    </label>
  )
}
