import { env } from '../../config/env.js'

const MINUTE = 60_000

/** Políticas de autenticación. Centralizadas para revisarlas de un vistazo. */
export const AUTH_POLICY = {
  /** Sesión: se cierra tras este tiempo sin actividad… */
  sessionIdleMs: 30 * MINUTE,
  /** …y, en cualquier caso, a las 12 h de iniciarla. */
  sessionAbsoluteMs: 12 * 60 * MINUTE,
  /** Frecuencia máxima con la que se actualiza `last_seen_at` (ahorra escrituras). */
  sessionTouchIntervalMs: 1 * MINUTE,
  /** Acciones sensibles exigen haber confirmado el 2FA hace menos de esto. */
  reauthMaxAgeMs: 10 * MINUTE,

  /** Tiempo para introducir el código 2FA tras la contraseña. */
  challengeTtlMs: 5 * MINUTE,
  /** Intentos de código por cada inicio de sesión. */
  challengeMaxAttempts: 5,

  /** Fallos seguidos (contraseña o código) antes de bloquear la cuenta. */
  lockoutThreshold: 5,
  /** Primer bloqueo; se duplica con cada fallo adicional… */
  lockoutBaseMs: 15 * MINUTE,
  /** …hasta este máximo (acotado para que nadie pueda dejarte fuera un día entero). */
  lockoutMaxMs: 60 * MINUTE,

  /** Códigos de recuperación generados por cuenta. */
  recoveryCodeCount: 10,
} as const

/**
 * Cookies. En producción usan el prefijo `__Host-`: el navegador exige Secure,
 * Path=/ y prohíbe Domain, así que la cookie queda atada a admin.hodex.es y
 * ningún otro subdominio puede leerla ni sobrescribirla.
 */
const secure = env.NODE_ENV === 'production'
const prefix = secure ? '__Host-' : ''

export const SESSION_COOKIE = `${prefix}hodex_session`
export const CHALLENGE_COOKIE = `${prefix}hodex_mfa`

export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure,
  sameSite: 'strict',
  path: '/',
} as const
