import { useState, type FormEvent } from 'react'
import { useLocation } from 'react-router-dom'
import { ApiError } from '../api/client'
import { useAuth } from '../auth/useAuth'
import { Eyebrow, IndexBox, Isotype } from '../components/brand'
import { Button } from '../components/Button'
import { Notice } from '../components/Notice'
import { TextField } from '../components/fields'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

type Step = 'credentials' | 'code'

/** Traduce un error de la API a un mensaje para el usuario. */
function messageFor(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'ValidationError') return 'Revisa los datos introducidos.'
    return error.message
  }
  return 'Algo salió mal. Inténtalo de nuevo.'
}

const REASON_NOTICES = {
  expired: 'Tu sesión ha caducado por seguridad. Vuelve a entrar.',
  logout: 'Has cerrado sesión.',
} as const

export function LoginPage() {
  const { startLogin, verifyLogin } = useAuth()
  const location = useLocation()
  const reason = (location.state as { reason?: keyof typeof REASON_NOTICES } | null)?.reason

  const [step, setStep] = useState<Step>('credentials')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [useRecoveryCode, setUseRecoveryCode] = useState(false)
  const [code, setCode] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(reason ? REASON_NOTICES[reason] : null)

  useDocumentTitle(step === 'credentials' ? 'Acceso' : 'Verificación')

  async function submitCredentials(event: FormEvent) {
    event.preventDefault()
    if (!email.trim() || !password) {
      setError('Introduce tu email y tu contraseña.')
      return
    }
    setPending(true)
    setError(null)
    setNotice(null)
    try {
      await startLogin(email, password)
      setPassword('') // No retener la contraseña en memoria más de lo necesario.
      setStep('code')
    } catch (err) {
      setError(messageFor(err))
    } finally {
      setPending(false)
    }
  }

  async function submitCode(value: string) {
    if (pending) return
    const complete = useRecoveryCode ? value.trim().length >= 12 : /^\d{6}$/.test(value)
    if (!complete) {
      setError(
        useRecoveryCode
          ? 'Introduce el código de recuperación completo.'
          : 'El código tiene 6 dígitos.',
      )
      return
    }
    setPending(true)
    setError(null)
    try {
      await verifyLogin(useRecoveryCode ? { recoveryCode: value } : { code: value })
      // Con sesión, <PublicOnly> redirige al panel automáticamente.
    } catch (err) {
      setCode('')
      if (err instanceof ApiError && err.code === 'LoginExpired') {
        restart('El tiempo para introducir el código ha caducado. Vuelve a empezar.')
      } else {
        setError(messageFor(err))
      }
    } finally {
      setPending(false)
    }
  }

  function onCodeChange(raw: string) {
    if (useRecoveryCode) {
      setCode(raw)
      return
    }
    const digits = raw.replace(/\D/g, '').slice(0, 6)
    setCode(digits)
    if (digits.length === 6) void submitCode(digits) // Envío automático al completar.
  }

  function toggleRecoveryCode() {
    setUseRecoveryCode((v) => !v)
    setCode('')
    setError(null)
  }

  function restart(message: string | null = null) {
    setStep('credentials')
    setCode('')
    setUseRecoveryCode(false)
    setError(null)
    setNotice(message)
  }

  return (
    <main className="grid min-h-svh lg:grid-cols-[1.15fr_1fr]">
      {/* ===== Panel de marca (negro) ===== */}
      <section className="flex flex-col justify-between gap-10 bg-hodex-black px-6 py-8 text-hodex-white md:px-12 md:py-12">
        <div className="flex items-center gap-3">
          <Isotype className="h-7 w-auto" />
          <span className="font-display text-xl font-light tracking-headline">HODEX</span>
        </div>

        <div className="hidden lg:block">
          <div className="font-display text-[clamp(96px,11vw,200px)] leading-tight font-extralight tracking-wordmark whitespace-nowrap text-metallic">
            HODEX
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <Eyebrow dark>Panel de gestión</Eyebrow>
          <p className="hidden text-small text-hodex-white/40 lg:block">
            Acceso restringido. Toda la actividad queda registrada.
          </p>
        </div>
      </section>

      {/* ===== Formulario ===== */}
      <section className="flex items-center justify-center bg-hodex-white px-6 py-16 md:px-12">
        <div className="flex w-full max-w-[400px] flex-col gap-10">
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
              <IndexBox>{step === 'credentials' ? '01/' : '02/'}</IndexBox>
              <span className="text-eyebrow uppercase tracking-eyebrow text-hodex-gray">
                {step === 'credentials' ? 'Acceso' : 'Verificación en dos pasos'}
              </span>
            </div>
            <h1 className="font-display text-h2 leading-tight font-light tracking-headline">
              {step === 'credentials' ? 'Inicia sesión' : 'Confirma que eres tú'}
            </h1>
            <p className="text-hodex-gray">
              {step === 'credentials'
                ? 'Introduce tu email y tu contraseña.'
                : useRecoveryCode
                  ? 'Introduce uno de tus códigos de recuperación. Cada código sirve una sola vez.'
                  : 'Introduce el código de 6 dígitos que muestra tu app de autenticación.'}
            </p>
          </div>

          {notice && <Notice tone="info">{notice}</Notice>}
          {error && <Notice>{error}</Notice>}

          {step === 'credentials' ? (
            <form onSubmit={submitCredentials} className="flex flex-col gap-8" noValidate>
              <TextField
                label="Email"
                type="email"
                name="email"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <TextField
                label="Contraseña"
                type="password"
                name="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Button
                type="submit"
                variant="primary"
                fullWidth
                loading={pending}
                loadingLabel="Comprobando…"
              >
                Continuar
              </Button>
            </form>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                void submitCode(code)
              }}
              className="flex flex-col gap-8"
              noValidate
            >
              {useRecoveryCode ? (
                <TextField
                  key="recovery"
                  label="Código de recuperación"
                  name="recovery-code"
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  placeholder="XXXX-XXXX-XXXX"
                  autoFocus
                  value={code}
                  onChange={(e) => onCodeChange(e.target.value)}
                  inputClassName="font-display text-h3 font-light uppercase tabular-nums"
                />
              ) : (
                <TextField
                  key="totp"
                  label="Código de verificación"
                  name="one-time-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="\d{6}"
                  maxLength={6}
                  placeholder="000000"
                  autoFocus
                  value={code}
                  onChange={(e) => onCodeChange(e.target.value)}
                  inputClassName="font-display text-h2 font-extralight tabular-nums"
                />
              )}

              <Button
                type="submit"
                variant="primary"
                fullWidth
                loading={pending}
                loadingLabel="Verificando…"
              >
                Verificar
              </Button>

              <div className="flex flex-col gap-3 border-t border-hodex-line pt-6 text-small">
                <button
                  type="button"
                  onClick={toggleRecoveryCode}
                  className="self-start text-hodex-gray underline-offset-4 transition-colors hover:text-hodex-black hover:underline"
                >
                  {useRecoveryCode
                    ? 'Usar la app de autenticación'
                    : '¿No tienes el móvil? Usa un código de recuperación'}
                </button>
                <button
                  type="button"
                  onClick={() => restart()}
                  className="self-start text-hodex-gray underline-offset-4 transition-colors hover:text-hodex-black hover:underline"
                >
                  ← Volver al inicio de sesión
                </button>
              </div>
            </form>
          )}
        </div>
      </section>
    </main>
  )
}
