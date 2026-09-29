import { useId, type InputHTMLAttributes } from 'react'

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  /** Texto de ayuda bajo el campo. */
  hint?: string
  /** Clases extra para el <input> (p. ej. tamaño del código 2FA). */
  inputClassName?: string
}

/**
 * Campo "solo línea inferior" de la marca, versión clara: sin caja, hairline
 * que se vuelve negra al enfocar. La etiqueta siempre visible (accesible).
 */
export function TextField({ label, hint, inputClassName = '', id, ...rest }: TextFieldProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  const hintId = hint ? `${inputId}-hint` : undefined

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="text-small text-hodex-gray">
        {label}
      </label>
      <input
        id={inputId}
        aria-describedby={hintId}
        className={`w-full border-0 border-b border-hodex-line bg-transparent py-3 font-body text-hodex-black transition-colors duration-300 placeholder:text-hodex-gray-light focus:border-hodex-black focus:outline-none ${inputClassName}`}
        {...rest}
      />
      {hint && (
        <p id={hintId} className="text-small text-hodex-gray">
          {hint}
        </p>
      )}
    </div>
  )
}
