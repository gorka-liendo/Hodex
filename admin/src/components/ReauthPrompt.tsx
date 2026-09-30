import { useState, type FormEvent } from 'react'
import { authApi } from '../api/auth'
import { ApiError } from '../api/client'
import { Button } from './Button'
import { TextField } from './fields'
import { Notice } from './Notice'

/**
 * Confirmación del código 2FA para acciones sensibles (eliminar, exportar…).
 * El backend responde `ReauthRequired` si hace más de 10 min que no se confirmó;
 * tras confirmar, `onConfirmed` reintenta la acción.
 */
export function ReauthPrompt({
  onConfirmed,
  onCancel,
}: {
  onConfirmed: () => void
  onCancel: () => void
}) {
  const [code, setCode] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(value: string) {
    if (pending || !/^\d{6}$/.test(value)) return
    setPending(true)
    setError(null)
    try {
      await authApi.reauth({ code: value })
      onConfirmed()
    } catch (err) {
      setCode('')
      setError(err instanceof ApiError ? err.message : 'No se pudo verificar el código.')
    } finally {
      setPending(false)
    }
  }

  function onChange(raw: string) {
    const digits = raw.replace(/\D/g, '').slice(0, 6)
    setCode(digits)
    if (digits.length === 6) void submit(digits)
  }

  return (
    <form
      onSubmit={(e: FormEvent) => {
        e.preventDefault()
        void submit(code)
      }}
      className="flex w-full max-w-[400px] flex-col gap-6 border border-hodex-black bg-hodex-white p-6"
    >
      <div className="flex flex-col gap-2">
        <span className="text-eyebrow uppercase tracking-eyebrow text-hodex-gray">
          Confirmación de seguridad
        </span>
        <p className="text-hodex-black">
          Para continuar, introduce el código de tu app de autenticación.
        </p>
      </div>
      {error && <Notice>{error}</Notice>}
      <TextField
        label="Código de verificación"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        placeholder="000000"
        autoFocus
        value={code}
        onChange={(e) => onChange(e.target.value)}
        inputClassName="font-display text-h3 font-extralight tabular-nums"
      />
      <div className="flex items-center gap-6">
        <Button type="submit" variant="dark" loading={pending} loadingLabel="Verificando…">
          Confirmar
        </Button>
        <button
          type="button"
          onClick={onCancel}
          className="text-small text-hodex-gray underline-offset-4 hover:text-hodex-black hover:underline"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
