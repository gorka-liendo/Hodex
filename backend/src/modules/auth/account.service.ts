import { eq } from 'drizzle-orm'
import { getDb } from '../../db/client.js'
import { adminUsers, sessions } from '../../db/schema/index.js'
import { AppError } from '../../lib/AppError.js'
import { checkPasswordPolicy, hashPassword, verifyPassword } from '../../lib/password.js'
import type { RequestContext } from '../../lib/requestContext.js'
import { recordAudit } from '../../services/audit.js'
import { notifyPasswordChanged, notifyRecoveryCodesRegenerated } from './auth.notifications.js'
import type { ChangePasswordInput } from './auth.schema.js'
import { registerFailure } from './login.service.js'
import { replaceRecoveryCodes } from './recoveryCodes.js'
import { createSession } from './sessions.service.js'

async function findUser(userId: string) {
  const [user] = await getDb().select().from(adminUsers).where(eq(adminUsers.id, userId)).limit(1)
  if (!user) throw new AppError(401, 'Tu sesión ha caducado. Vuelve a iniciar sesión.', { code: 'Unauthenticated' })
  return user
}

/**
 * Cambia la contraseña. Exige la actual (un fallo cuenta para el bloqueo, como
 * en el login) y cierra TODAS las sesiones: la actual se sustituye por una
 * nueva, cuyo token se devuelve para la cookie.
 */
export async function changePassword(
  userId: string,
  input: ChangePasswordInput,
  context: RequestContext,
  now = new Date(),
): Promise<string> {
  const user = await findUser(userId)

  if (!(await verifyPassword(user.passwordHash, input.currentPassword))) {
    await recordAudit({
      action: 'auth.password.change',
      outcome: 'failure',
      userId,
      context,
      metadata: { reason: 'wrong_password' },
    })
    await registerFailure(user, context, now)
    throw new AppError(400, 'La contraseña actual no es correcta.', {
      code: 'WrongPassword',
      details: [{ path: ['currentPassword'], message: 'La contraseña actual no es correcta.' }],
    })
  }

  const problems = checkPasswordPolicy(input.newPassword, user.email)
  if (await verifyPassword(user.passwordHash, input.newPassword)) {
    problems.push('Debe ser distinta de la actual.')
  }
  if (problems.length > 0) {
    throw new AppError(400, 'La contraseña nueva no cumple la política.', {
      code: 'WeakPassword',
      details: problems.map((message) => ({ path: ['newPassword'], message })),
    })
  }

  const passwordHash = await hashPassword(input.newPassword)
  const token = await getDb().transaction(async (tx) => {
    // passwordChangedAt invalida cualquier sesión anterior (ver validateSession);
    // además se borran para no dejar filas huérfanas.
    await tx
      .update(adminUsers)
      .set({ passwordHash, passwordChangedAt: now, failedLoginCount: 0 })
      .where(eq(adminUsers.id, userId))
    await tx.delete(sessions).where(eq(sessions.userId, userId))
    const sessionToken = await createSession(tx, userId, context, now)
    await recordAudit({ action: 'auth.password.change', outcome: 'success', userId, context }, tx)
    return sessionToken
  })

  notifyPasswordChanged(user.email, context, now)
  return token
}

/** Sustituye los códigos de recuperación. Los anteriores dejan de valer. */
export async function regenerateRecoveryCodes(
  userId: string,
  context: RequestContext,
  now = new Date(),
): Promise<string[]> {
  const user = await findUser(userId)
  const codes = await getDb().transaction(async (tx) => {
    const fresh = await replaceRecoveryCodes(tx, userId)
    await recordAudit({ action: 'auth.recovery_codes.regenerate', outcome: 'success', userId, context }, tx)
    return fresh
  })
  notifyRecoveryCodesRegenerated(user.email, context, now)
  return codes
}
