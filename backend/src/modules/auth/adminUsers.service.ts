import { randomUUID } from 'node:crypto'
import { getDb } from '../../db/client.js'
import { adminUsers } from '../../db/schema/index.js'
import { AppError } from '../../lib/AppError.js'
import { encryptSecret } from '../../lib/crypto.js'
import { checkPasswordPolicy, hashPassword } from '../../lib/password.js'
import { recordAudit } from '../../services/audit.js'
import { replaceRecoveryCodes } from './recoveryCodes.js'

/** Contexto AAD del secreto TOTP: lo ata criptográficamente a su usuario. */
export const totpContext = (userId: string) => `admin_users.totp_secret:${userId}`

export interface NewAdminUser {
  email: string
  password: string
  /** Secreto TOTP (base32) ya confirmado por el usuario con un código válido. */
  totpSecret: string
  /** Paso del código de confirmación: queda consumido y no sirve para entrar. */
  confirmedTotpStep?: number
}

/**
 * Crea una cuenta del panel con el 2FA ya activo y sus códigos de recuperación.
 * Solo se usa desde el script `admin:create` (no hay registro público).
 */
export async function createAdminUser(
  input: NewAdminUser,
): Promise<{ id: string; email: string; recoveryCodes: string[] }> {
  const email = input.email.trim().toLowerCase()
  const problems = checkPasswordPolicy(input.password, email)
  if (problems.length > 0) {
    throw new AppError(400, 'La contraseña no cumple la política.', {
      code: 'WeakPassword',
      details: problems,
    })
  }

  const id = randomUUID()
  const passwordHash = await hashPassword(input.password)
  const totpSecretEnc = encryptSecret(input.totpSecret, totpContext(id))

  const recoveryCodes = await getDb().transaction(async (tx) => {
    await tx.insert(adminUsers).values({
      id,
      email,
      passwordHash,
      totpSecretEnc,
      totpEnabledAt: new Date(),
      totpLastUsedStep: input.confirmedTotpStep ?? null,
    })
    const codes = await replaceRecoveryCodes(tx, id)
    await recordAudit(
      { action: 'auth.admin_created', outcome: 'success', userId: id, metadata: { via: 'cli' } },
      tx,
    )
    return codes
  })

  return { id, email, recoveryCodes }
}
