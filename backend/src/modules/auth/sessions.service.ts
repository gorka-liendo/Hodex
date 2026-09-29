import { and, eq, lt, ne, or } from 'drizzle-orm'
import { getDb, type DbExecutor } from '../../db/client.js'
import { adminUsers, sessions } from '../../db/schema/index.js'
import { randomToken, sha256Hex } from '../../lib/crypto.js'
import type { RequestContext } from '../../lib/requestContext.js'
import { AUTH_POLICY } from './auth.config.js'
import type { AuthContext } from './auth.types.js'

/** Los tokens son 32 bytes en base64url: descarta basura antes de ir a la BD. */
const TOKEN_FORMAT = /^[A-Za-z0-9_-]{43}$/

/**
 * Crea una sesión y devuelve el token en claro (va a la cookie). En la BD solo
 * se guarda su SHA-256.
 */
export async function createSession(
  db: DbExecutor,
  userId: string,
  context: RequestContext,
  now = new Date(),
): Promise<string> {
  const token = randomToken()
  await db.insert(sessions).values({
    id: sha256Hex(token),
    userId,
    createdAt: now,
    lastSeenAt: now,
    reauthenticatedAt: now,
    expiresAt: new Date(now.getTime() + AUTH_POLICY.sessionAbsoluteMs),
    ipAddress: context.ip,
    userAgent: context.userAgent,
  })
  return token
}

/**
 * Valida un token de sesión. Devuelve null (y borra la sesión) si no existe,
 * ha caducado por inactividad o por tiempo absoluto, o si la contraseña cambió
 * después de iniciarla. Si es válida, renueva la inactividad.
 */
export async function validateSession(
  token: string,
  now = new Date(),
): Promise<AuthContext | null> {
  if (!TOKEN_FORMAT.test(token)) return null

  const db = getDb()
  const id = sha256Hex(token)
  const [row] = await db
    .select({
      session: sessions,
      email: adminUsers.email,
      passwordChangedAt: adminUsers.passwordChangedAt,
    })
    .from(sessions)
    .innerJoin(adminUsers, eq(sessions.userId, adminUsers.id))
    .where(eq(sessions.id, id))
    .limit(1)

  if (!row) return null
  const { session } = row

  const idleFor = now.getTime() - session.lastSeenAt.getTime()
  const expired =
    now >= session.expiresAt ||
    idleFor > AUTH_POLICY.sessionIdleMs ||
    row.passwordChangedAt > session.createdAt

  if (expired) {
    await db.delete(sessions).where(eq(sessions.id, id))
    return null
  }

  if (idleFor > AUTH_POLICY.sessionTouchIntervalMs) {
    await db.update(sessions).set({ lastSeenAt: now }).where(eq(sessions.id, id))
  }

  return {
    sessionId: session.id,
    userId: session.userId,
    email: row.email,
    createdAt: session.createdAt,
    expiresAt: session.expiresAt,
    reauthenticatedAt: session.reauthenticatedAt,
  }
}

/** Cierra la sesión de un token (si existe). */
export async function revokeSessionByToken(token: string): Promise<void> {
  if (!TOKEN_FORMAT.test(token)) return
  await getDb().delete(sessions).where(eq(sessions.id, sha256Hex(token)))
}

/** Cierra todas las sesiones del usuario salvo, opcionalmente, una. */
export async function revokeUserSessions(
  userId: string,
  exceptSessionId?: string,
): Promise<number> {
  const deleted = await getDb()
    .delete(sessions)
    .where(
      exceptSessionId
        ? and(eq(sessions.userId, userId), ne(sessions.id, exceptSessionId))
        : eq(sessions.userId, userId),
    )
    .returning({ id: sessions.id })
  return deleted.length
}

/** Marca que el usuario acaba de volver a confirmar su 2FA. */
export async function markReauthenticated(
  sessionId: string,
  now = new Date(),
): Promise<void> {
  await getDb()
    .update(sessions)
    .set({ reauthenticatedAt: now })
    .where(eq(sessions.id, sessionId))
}

/** Limpieza oportunista de sesiones caducadas. */
export async function purgeExpiredSessions(now = new Date()): Promise<void> {
  const idleLimit = new Date(now.getTime() - AUTH_POLICY.sessionIdleMs)
  await getDb()
    .delete(sessions)
    .where(or(lt(sessions.expiresAt, now), lt(sessions.lastSeenAt, idleLimit)))
}
