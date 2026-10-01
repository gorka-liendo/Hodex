import type { Request, Response } from 'express'
import { isAiConfigured } from '../../config/env.js'
import { getRequestContext } from '../../lib/requestContext.js'
import { recordAudit } from '../../services/audit.js'
import { AUTH_POLICY, CHALLENGE_COOKIE, COOKIE_OPTIONS, SESSION_COOKIE } from './auth.config.js'
import { getAuth, readCookie } from './auth.middleware.js'
import { changePasswordSchema, loginSchema, secondFactorSchema } from './auth.schema.js'
import { changePassword, regenerateRecoveryCodes } from './account.service.js'
import { completeLogin, reauthenticate, startLogin } from './login.service.js'
import { countRemainingRecoveryCodes } from './recoveryCodes.js'
import { revokeSessionByToken, revokeUserSessions } from './sessions.service.js'

/** POST /api/admin/auth/login — paso 1: email + contraseña. */
export async function login(req: Request, res: Response): Promise<void> {
  const input = loginSchema.parse(req.body)
  const challengeToken = await startLogin(input, getRequestContext(req, res))

  res.cookie(CHALLENGE_COOKIE, challengeToken, {
    ...COOKIE_OPTIONS,
    maxAge: AUTH_POLICY.challengeTtlMs,
  })
  res.json({ status: 'mfa_required' })
}

/** POST /api/admin/auth/login/verify — paso 2: código 2FA → sesión. */
export async function verifyLogin(req: Request, res: Response): Promise<void> {
  const input = secondFactorSchema.parse(req.body)
  const { sessionToken, user } = await completeLogin(
    readCookie(req, CHALLENGE_COOKIE),
    input,
    getRequestContext(req, res),
  )

  res.clearCookie(CHALLENGE_COOKIE, COOKIE_OPTIONS)
  // Sin maxAge: cookie de sesión del navegador. La caducidad real la decide el servidor.
  res.cookie(SESSION_COOKIE, sessionToken, COOKIE_OPTIONS)
  res.json({ user: { email: user.email } })
}

/** GET /api/admin/auth/session — ¿quién soy y hasta cuándo? */
export async function getSession(_req: Request, res: Response): Promise<void> {
  const auth = getAuth(res)
  res.json({
    user: { email: auth.email },
    session: {
      createdAt: auth.createdAt,
      expiresAt: auth.expiresAt,
      idleTimeoutSeconds: AUTH_POLICY.sessionIdleMs / 1000,
    },
    recoveryCodesRemaining: await countRemainingRecoveryCodes(auth.userId),
    // Funciones opcionales disponibles en este despliegue.
    features: { aiReading: isAiConfigured },
  })
}

/** POST /api/admin/auth/reauth — confirma el 2FA para acciones sensibles. */
export async function reauth(req: Request, res: Response): Promise<void> {
  const auth = getAuth(res)
  const input = secondFactorSchema.parse(req.body)
  await reauthenticate(auth.userId, auth.sessionId, input, getRequestContext(req, res))
  res.status(204).end()
}

/**
 * POST /api/admin/auth/logout — cierra la sesión actual. Siempre responde 204
 * y borra la cookie, aunque la sesión ya no existiera.
 */
export async function logout(req: Request, res: Response): Promise<void> {
  const token = readCookie(req, SESSION_COOKIE)
  if (token) await revokeSessionByToken(token)
  res.clearCookie(SESSION_COOKIE, COOKIE_OPTIONS)
  res.status(204).end()
}

/** POST /api/admin/auth/logout-others — cierra el resto de sesiones abiertas. */
export async function logoutOthers(req: Request, res: Response): Promise<void> {
  const auth = getAuth(res)
  const revoked = await revokeUserSessions(auth.userId, auth.sessionId)
  await recordAudit({
    action: 'auth.sessions.revoke_others',
    outcome: 'success',
    userId: auth.userId,
    context: getRequestContext(req, res),
    metadata: { revoked },
  })
  res.json({ revoked })
}

/**
 * POST /api/admin/auth/password — cambia la contraseña. Cierra todas las
 * sesiones y entrega una nueva para este navegador.
 */
export async function updatePassword(req: Request, res: Response): Promise<void> {
  const auth = getAuth(res)
  const input = changePasswordSchema.parse(req.body)
  const sessionToken = await changePassword(auth.userId, input, getRequestContext(req, res))
  res.cookie(SESSION_COOKIE, sessionToken, COOKIE_OPTIONS)
  res.status(204).end()
}

/** POST /api/admin/auth/recovery-codes — genera códigos nuevos (se muestran una vez). */
export async function newRecoveryCodes(req: Request, res: Response): Promise<void> {
  const auth = getAuth(res)
  const recoveryCodes = await regenerateRecoveryCodes(auth.userId, getRequestContext(req, res))
  res.json({ recoveryCodes })
}
