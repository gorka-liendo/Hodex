import { useState, type FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { authApi } from '../api/auth'
import { ApiError, saveBlob } from '../api/client'
import { useAuth } from '../auth/useAuth'
import { Button } from '../components/Button'
import { TextField } from '../components/fields'
import { Notice } from '../components/Notice'
import { ReauthPrompt } from '../components/ReauthPrompt'

const linkClass = 'text-small text-hodex-gray underline-offset-4 hover:text-hodex-black hover:underline'
const PASSWORD_MIN_LENGTH = 14

const needsReauth = (error: unknown) => error instanceof ApiError && error.code === 'ReauthRequired'

// ─── Contraseña ──────────────────────────────────────────────────────────────

/** Cambio de contraseña. Cierra el resto de sesiones; esta sigue abierta. */
export function PasswordSection() {
  const { refresh } = useAuth()
  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [repeat, setRepeat] = useState('')
  const [mismatch, setMismatch] = useState(false)
  const [reauth, setReauth] = useState(false)

  const change = useMutation({
    mutationFn: () => authApi.changePassword(current, next),
    onSuccess: () => {
      setOpen(false)
      setCurrent('')
      setNext('')
      setRepeat('')
      void refresh()
    },
    onError: (error) => {
      if (needsReauth(error)) setReauth(true)
    },
  })
  const error = change.error instanceof ApiError && !needsReauth(change.error) ? change.error : null

  function submit(e: FormEvent) {
    e.preventDefault()
    const differs = next !== repeat
    setMismatch(differs)
    if (!differs) change.mutate()
  }

  if (!open) {
    return (
      <div className="flex flex-col items-start gap-6">
        <p className="max-w-[640px] text-hodex-gray">
          Al cambiarla se cierran las sesiones abiertas en otros dispositivos. Te avisamos por email.
        </p>
        <Button
          variant="outline"
          onClick={() => {
            change.reset()
            setOpen(true)
          }}
        >
          Cambiar contraseña
        </Button>
        {change.isSuccess && <Notice tone="info">Contraseña cambiada. Las demás sesiones se han cerrado.</Notice>}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <form
        onSubmit={submit}
        noValidate
        className="flex max-w-[560px] flex-col gap-6 border border-hodex-line bg-hodex-white p-6"
      >
        {error && error.issues.length === 0 && <Notice>{error.message}</Notice>}
        <TextField
          label="Contraseña actual"
          type="password"
          autoComplete="current-password"
          value={current}
          error={error?.fieldErrors.currentPassword}
          onChange={(e) => setCurrent(e.target.value)}
        />
        <TextField
          label="Contraseña nueva"
          type="password"
          autoComplete="new-password"
          hint={`Mínimo ${PASSWORD_MIN_LENGTH} caracteres. Una frase de varias palabras es lo más fácil de recordar.`}
          value={next}
          error={error?.fieldErrors.newPassword}
          onChange={(e) => setNext(e.target.value)}
        />
        <TextField
          label="Repite la contraseña nueva"
          type="password"
          autoComplete="new-password"
          value={repeat}
          error={mismatch ? 'No coincide con la contraseña nueva' : undefined}
          onChange={(e) => setRepeat(e.target.value)}
        />
        <div className="flex items-center gap-6">
          <Button type="submit" variant="dark" loading={change.isPending} loadingLabel="Guardando…">
            Guardar contraseña
          </Button>
          <button type="button" className={linkClass} onClick={() => setOpen(false)}>
            Cancelar
          </button>
        </div>
      </form>
      {reauth && (
        <ReauthPrompt
          onConfirmed={() => {
            setReauth(false)
            change.mutate()
          }}
          onCancel={() => setReauth(false)}
        />
      )}
    </div>
  )
}

// ─── Códigos de recuperación ─────────────────────────────────────────────────

/**
 * Genera códigos nuevos. Se muestran una sola vez: el servidor solo guarda su
 * hash, así que hay que copiarlos o descargarlos antes de cerrar.
 */
export function RecoveryCodesAction() {
  const { refresh } = useAuth()
  const [step, setStep] = useState<'idle' | 'confirm' | 'reauth'>('idle')
  const [copied, setCopied] = useState(false)

  const regenerate = useMutation({
    mutationFn: authApi.regenerateRecoveryCodes,
    onSuccess: () => {
      setStep('idle')
      void refresh()
    },
    onError: (error) => {
      if (needsReauth(error)) setStep('reauth')
    },
  })
  const error = regenerate.error && !needsReauth(regenerate.error) ? regenerate.error : null
  const codes = regenerate.data?.recoveryCodes

  if (codes) {
    const asText = `Códigos de recuperación · Hodex\nCada código sirve una sola vez.\n\n${codes.join('\n')}\n`
    return (
      <div className="flex flex-col gap-6 border border-hodex-black bg-hodex-white p-6">
        <p>
          <b className="font-semibold text-hodex-black">Guárdalos ahora: no se volverán a mostrar.</b>{' '}
          <span className="text-hodex-gray">Los anteriores ya no sirven.</span>
        </p>
        <ol className="grid grid-cols-1 gap-x-8 border-t border-hodex-line sm:grid-cols-2">
          {codes.map((code, i) => (
            <li key={code} className="flex items-baseline gap-4 border-b border-hodex-line py-3">
              <span className="text-small text-hodex-gray-light tabular-nums">{String(i + 1).padStart(2, '0')}</span>
              <span className="tracking-[0.06em] tabular-nums select-all">{code}</span>
            </li>
          ))}
        </ol>
        <div className="flex flex-wrap items-center gap-6">
          <Button variant="dark" onClick={() => saveBlob(new Blob([asText], { type: 'text/plain' }), 'hodex-codigos-recuperacion.txt')}>
            Descargar .txt
          </Button>
          <button
            type="button"
            className={linkClass}
            onClick={() => void navigator.clipboard.writeText(asText).then(() => setCopied(true))}
          >
            {copied ? 'Copiados' : 'Copiar'}
          </button>
          <button type="button" className={linkClass} onClick={() => regenerate.reset()}>
            Ya los he guardado
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-start gap-6">
      {step === 'idle' && (
        <Button variant="outline" onClick={() => setStep('confirm')}>
          Generar códigos nuevos
        </Button>
      )}
      {step === 'confirm' && (
        <div className="flex flex-col items-start gap-4">
          <p className="max-w-[640px] text-hodex-black">
            Se crearán 10 códigos nuevos y los que tienes ahora dejarán de funcionar.
          </p>
          <div className="flex items-center gap-6">
            <Button variant="dark" loading={regenerate.isPending} loadingLabel="Generando…" onClick={() => regenerate.mutate()}>
              Generar
            </Button>
            <button type="button" className={linkClass} onClick={() => setStep('idle')}>
              Cancelar
            </button>
          </div>
        </div>
      )}
      {step === 'reauth' && (
        <ReauthPrompt onConfirmed={() => regenerate.mutate()} onCancel={() => setStep('idle')} />
      )}
      {error && <Notice>{error instanceof ApiError ? error.message : 'No se pudieron generar los códigos.'}</Notice>}
    </div>
  )
}
