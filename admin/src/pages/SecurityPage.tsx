import { useState, type ReactNode } from 'react'
import { authApi } from '../api/auth'
import { ApiError } from '../api/client'
import { useSession } from '../auth/useAuth'
import { Eyebrow } from '../components/brand'
import { Button } from '../components/Button'
import { Notice } from '../components/Notice'
import { PageHeader } from '../components/PageHeader'
import { formatDateTime } from '../lib/format'
import { PasswordSection, RecoveryCodesAction } from './SecurityCredentials'

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-hodex-line py-5 sm:flex-row sm:items-baseline sm:gap-8">
      <dt className="w-56 shrink-0 text-small text-hodex-gray">{label}</dt>
      <dd className="text-hodex-black">{children}</dd>
    </div>
  )
}

export function SecurityPage() {
  const { user, session, recoveryCodesRemaining } = useSession()
  const [revoking, setRevoking] = useState(false)
  const [result, setResult] = useState<{ tone: 'info' | 'error'; text: string } | null>(null)

  async function logoutOthers() {
    setRevoking(true)
    setResult(null)
    try {
      const { revoked } = await authApi.logoutOthers()
      setResult({
        tone: 'info',
        text:
          revoked === 0
            ? 'No había otras sesiones abiertas.'
            : `Se ${revoked === 1 ? 'ha cerrado 1 sesión' : `han cerrado ${revoked} sesiones`}.`,
      })
    } catch (error) {
      setResult({
        tone: 'error',
        text: error instanceof ApiError ? error.message : 'No se pudieron cerrar las sesiones.',
      })
    } finally {
      setRevoking(false)
    }
  }

  const fewCodesLeft = recoveryCodesRemaining <= 3

  return (
    <div className="flex flex-col gap-16">
      <PageHeader
        eyebrow="Cuenta"
        title="Seguridad"
        description="Tu sesión, tu contraseña, tus códigos de recuperación y el control de los accesos abiertos."
      />

      <section className="flex flex-col gap-6">
        <Eyebrow>Sesión actual</Eyebrow>
        <dl className="border-t border-hodex-line">
          <Row label="Cuenta">{user.email}</Row>
          <Row label="Iniciada">{formatDateTime(session.createdAt)}</Row>
          <Row label="Caduca como máximo">{formatDateTime(session.expiresAt)}</Row>
          <Row label="Cierre por inactividad">
            Tras {Math.round(session.idleTimeoutSeconds / 60)} minutos sin actividad
          </Row>
          <Row label="Verificación en dos pasos">Activa · app de autenticación</Row>
        </dl>
      </section>

      <section className="flex flex-col gap-6">
        <Eyebrow>Contraseña</Eyebrow>
        <PasswordSection />
      </section>

      <section className="flex flex-col gap-6">
        <Eyebrow>Códigos de recuperación</Eyebrow>
        <div className="flex flex-col gap-4 border border-hodex-line bg-hodex-white p-8">
          <p className="font-display text-h2 leading-tight font-extralight tabular-nums">
            {recoveryCodesRemaining}
            <span className="text-hodex-gray-light"> / 10</span>
          </p>
          <p className="max-w-[640px] text-hodex-gray">
            Cada código sirve una vez para entrar si no tienes el móvil a mano.
            {fewCodesLeft && (
              <b className="font-semibold text-hodex-black"> Te quedan pocos: genera unos nuevos.</b>
            )}
          </p>
        </div>
        <RecoveryCodesAction />
      </section>

      <section className="flex flex-col gap-6">
        <Eyebrow>Otros dispositivos</Eyebrow>
        <div className="flex flex-col items-start gap-6">
          <p className="max-w-[640px] text-hodex-gray">
            Si has entrado desde otro ordenador o sospechas de un acceso que no reconoces, cierra
            todas las sesiones excepto esta.
          </p>
          <Button variant="outline" onClick={logoutOthers} loading={revoking} loadingLabel="Cerrando…">
            Cerrar las demás sesiones
          </Button>
          {result && <Notice tone={result.tone}>{result.text}</Notice>}
        </div>
      </section>
    </div>
  )
}
