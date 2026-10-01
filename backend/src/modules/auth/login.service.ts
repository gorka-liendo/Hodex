import { and, eq, isNull, lt, or, sql } from 'drizzle-orm'
import { getDb } from '../../db/client.js'
import { adminUsers, loginChallenges } from '../../db/schema/index.js'
import { AppError } from '../../lib/AppError.js'
import { decryptSecret, randomToken, sha256Hex } from '../../lib/crypto.js'
import { burnPasswordCheck, verifyPassword } from '../../lib/password.js'
import type { RequestContext } from '../../lib/requestContext.js'
import { verifyTotp } from '../../lib/totp.js'
import { recordAudit } from '../../services/audit.js'
import { AUTH_POLICY } from './auth.config.js'
import {
  notifyLockout,
  notifyNewLogin,
  notifyRecoveryCodeUsed,
} from './auth.notifications.js'
import type { LoginInput, SecondFactorInput } from './auth.schema.js'
import { totpContext } from './adminUsers.service.js'
import { consumeRecoveryCode, countRemainingRecoveryCodes } from './recoveryCodes.js'
import { createSession, markReauthenticated, purgeExpiredSessions } from './sessions.service.js'

type AdminUser = typeof adminUsers.$inferSelect

/**
 * Un único mensaje para cualquier fallo de credenciales: no revela si el email
 * existe, si la contraseña era correcta o si la cuenta está bloqueada.
 */
const invalidCredentials = () =>
  new AppError(401, 'Email, contraseña o código incorrectos.', {
    code: 'InvalidCredentials',
  })

const loginExpired = () =>
  new AppError(401, 'El inicio de sesión ha caducado. Vuelve a introducir tu contraseña.', {
    code: 'LoginExpired',
  })

const isLocked = (user: AdminUser, now: Date) =>
  user.lockedUntil !== null && user.lockedUntil > now

async function findUserByEmail(email: string): Promise<AdminUser | undefined> {
  const [user] = await getDb()
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.email, email))
    .limit(1)
  return user
}

async function findUserById(id: string): Promise<AdminUser | undefined> {
  const [user] = await getDb().select().from(adminUsers).where(eq(adminUsers.id, id)).limit(1)
  return user
}

/**
 * Suma un fallo al contador (de forma atómica) y, al llegar al umbral, bloquea
 * la cuenta. Cada fallo extra duplica el bloqueo hasta el máximo.
 */
export async function registerFailure(
  user: AdminUser,
  context: RequestContext,
  now: Date,
): Promise<void> {
  const db = getDb()
  const [row] = await db
    .update(adminUsers)
    .set({ failedLoginCount: sql`${adminUsers.failedLoginCount} + 1` })
    .where(eq(adminUsers.id, user.id))
    .returning({ failedLoginCount: adminUsers.failedLoginCount })

  const failures = row?.failedLoginCount ?? 0
  if (failures < AUTH_POLICY.lockoutThreshold) return

  const exponent = failures - AUTH_POLICY.lockoutThreshold
  const durationMs = Math.min(
    AUTH_POLICY.lockoutBaseMs * 2 ** exponent,
    AUTH_POLICY.lockoutMaxMs,
  )
  const lockedUntil = new Date(now.getTime() + durationMs)
  await db.update(adminUsers).set({ lockedUntil }).where(eq(adminUsers.id, user.id))
  await recordAudit({
    action: 'auth.lockout',
    outcome: 'success',
    userId: user.id,
    context,
    metadata: { failures, lockedUntil: lockedUntil.toISOString() },
  })
  notifyLockout(user.email, context, lockedUntil, now)
}

// ─── Paso 1: email + contraseña ──────────────────────────────────────────────

/**
 * Comprueba email y contraseña. Si son correctos NO crea la sesión todavía:
 * devuelve un token de "desafío" que solo sirve para el paso del código 2FA.
 */
export async function startLogin(
  input: LoginInput,
  context: RequestContext,
  now = new Date(),
): Promise<string> {
  const user = await findUserByEmail(input.email)

  if (!user || isLocked(user, now)) {
    // Mismo coste que una verificación real: el tiempo de respuesta no delata nada.
    await burnPasswordCheck(input.password)
    await recordAudit({
      action: 'auth.login.password',
      outcome: 'failure',
      userId: user?.id ?? null,
      context,
      metadata: { reason: user ? 'locked' : 'unknown_email', email: input.email },
    })
    throw invalidCredentials()
  }

  if (!(await verifyPassword(user.passwordHash, input.password))) {
    await recordAudit({
      action: 'auth.login.password',
      outcome: 'failure',
      userId: user.id,
      context,
      metadata: { reason: 'wrong_password' },
    })
    await registerFailure(user, context, now)
    throw invalidCredentials()
  }

  // Las cuentas se crean siempre con 2FA; sin él no se entra (falla cerrado).
  if (!user.totpSecretEnc || !user.totpEnabledAt) {
    await recordAudit({
      action: 'auth.login.password',
      outcome: 'failure',
      userId: user.id,
      context,
      metadata: { reason: 'mfa_not_configured' },
    })
    throw invalidCredentials()
  }

  const db = getDb()
  // Limpieza oportunista de desafíos y sesiones caducados.
  await db.delete(loginChallenges).where(lt(loginChallenges.expiresAt, now))
  await purgeExpiredSessions(now)

  const token = randomToken()
  await db.insert(loginChallenges).values({
    id: sha256Hex(token),
    userId: user.id,
    createdAt: now,
    expiresAt: new Date(now.getTime() + AUTH_POLICY.challengeTtlMs),
    ipAddress: context.ip,
  })
  await recordAudit({
    action: 'auth.login.password',
    outcome: 'success',
    userId: user.id,
    context,
  })
  return token
}

// ─── Segundo factor ─────────────────────────────────────────────────────────

/**
 * Verifica un código TOTP o de recuperación. El TOTP se "consume": se guarda
 * su paso de tiempo con un UPDATE condicionado, así que el mismo código no
 * vale dos veces (ni siquiera en dos peticiones simultáneas).
 */
async function verifySecondFactor(
  user: AdminUser,
  input: SecondFactorInput,
): Promise<'totp' | 'recovery_code' | null> {
  if ('recoveryCode' in input) {
    return (await consumeRecoveryCode(user.id, input.recoveryCode)) ? 'recovery_code' : null
  }

  if (!user.totpSecretEnc) return null
  const secret = decryptSecret(user.totpSecretEnc, totpContext(user.id))
  const step = verifyTotp(secret, input.code)
  if (step === null) return null

  const consumed = await getDb()
    .update(adminUsers)
    .set({ totpLastUsedStep: step })
    .where(
      and(
        eq(adminUsers.id, user.id),
        or(isNull(adminUsers.totpLastUsedStep), lt(adminUsers.totpLastUsedStep, step)),
      ),
    )
    .returning({ id: adminUsers.id })
  return consumed.length > 0 ? 'totp' : null
}

// ─── Paso 2: código 2FA → sesión ─────────────────────────────────────────────

export interface CompletedLogin {
  sessionToken: string
  user: { id: string; email: string }
}

export async function completeLogin(
  challengeToken: string | undefined,
  input: SecondFactorInput,
  context: RequestContext,
  now = new Date(),
): Promise<CompletedLogin> {
  if (!challengeToken) throw loginExpired()
  const db = getDb()
  const challengeId = sha256Hex(challengeToken)

  // Cuenta el intento de forma atómica; si ya no quedan (o caducó), fuera.
  const [challenge] = await db
    .update(loginChallenges)
    .set({ attempts: sql`${loginChallenges.attempts} + 1` })
    .where(
      and(
        eq(loginChallenges.id, challengeId),
        lt(loginChallenges.attempts, AUTH_POLICY.challengeMaxAttempts),
      ),
    )
    .returning()

  if (!challenge || challenge.expiresAt <= now) {
    await db.delete(loginChallenges).where(eq(loginChallenges.id, challengeId))
    throw loginExpired()
  }

  const user = await findUserById(challenge.userId)
  if (!user || isLocked(user, now)) {
    await db.delete(loginChallenges).where(eq(loginChallenges.id, challengeId))
    throw invalidCredentials()
  }

  const method = await verifySecondFactor(user, input)
  if (!method) {
    await recordAudit({
      action: 'auth.login.mfa',
      outcome: 'failure',
      userId: user.id,
      context,
      metadata: { method: 'code' in input ? 'totp' : 'recovery_code' },
    })
    await registerFailure(user, context, now)
    throw invalidCredentials()
  }

  const sessionToken = await db.transaction(async (tx) => {
    await tx.delete(loginChallenges).where(eq(loginChallenges.userId, user.id))
    await tx
      .update(adminUsers)
      .set({ failedLoginCount: 0, lockedUntil: null, lastLoginAt: now })
      .where(eq(adminUsers.id, user.id))
    const token = await createSession(tx, user.id, context, now)
    await recordAudit(
      { action: 'auth.login.mfa', outcome: 'success', userId: user.id, context, metadata: { method } },
      tx,
    )
    return token
  })

  notifyNewLogin(user.email, context, now)
  if (method === 'recovery_code') {
    notifyRecoveryCodeUsed(user.email, context, await countRemainingRecoveryCodes(user.id), now)
  }

  return { sessionToken, user: { id: user.id, email: user.email } }
}

// ─── Reautenticación (acciones sensibles) ────────────────────────────────────

/** Vuelve a pedir el código 2FA dentro de una sesión ya iniciada. */
export async function reauthenticate(
  userId: string,
  sessionId: string,
  input: SecondFactorInput,
  context: RequestContext,
  now = new Date(),
): Promise<void> {
  const user = await findUserById(userId)
  if (!user || isLocked(user, now)) throw invalidCredentials()

  const method = await verifySecondFactor(user, input)
  await recordAudit({
    action: 'auth.reauth',
    outcome: method ? 'success' : 'failure',
    userId,
    context,
    metadata: { method: method ?? ('code' in input ? 'totp' : 'recovery_code') },
  })

  if (!method) {
    await registerFailure(user, context, now)
    throw invalidCredentials()
  }
  await markReauthenticated(sessionId, now)
}
