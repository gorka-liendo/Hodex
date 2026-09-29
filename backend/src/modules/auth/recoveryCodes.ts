import { randomInt } from 'node:crypto'
import { and, count, eq, isNull } from 'drizzle-orm'
import { getDb, type DbExecutor } from '../../db/client.js'
import { recoveryCodes } from '../../db/schema/index.js'
import { sha256Hex } from '../../lib/crypto.js'
import { AUTH_POLICY } from './auth.config.js'

/**
 * Códigos de recuperación: 12 caracteres (~60 bits) de un alfabeto sin
 * caracteres confusos (0/O, 1/I/L), agrupados como `ABCD-EFGH-JKMN`. Al tener
 * tanta entropía basta con SHA-256 para guardarlos (no hace falta argon2).
 */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const LENGTH = 12

export function generateRecoveryCode(): string {
  let code = ''
  for (let i = 0; i < LENGTH; i++) code += ALPHABET[randomInt(ALPHABET.length)]
  return code.match(/.{4}/g)!.join('-')
}

/** Mayúsculas y sin guiones ni espacios: acepta el código como lo teclee el usuario. */
export function normalizeRecoveryCode(input: string): string {
  return input.toUpperCase().replace(/[\s-]/g, '')
}

export function hashRecoveryCode(code: string): string {
  return sha256Hex(normalizeRecoveryCode(code))
}

/**
 * Sustituye todos los códigos del usuario por unos nuevos. Devuelve los códigos
 * en claro: es la única vez que existen fuera de la cabeza del usuario.
 */
export async function replaceRecoveryCodes(
  db: DbExecutor,
  userId: string,
): Promise<string[]> {
  const codes = Array.from({ length: AUTH_POLICY.recoveryCodeCount }, generateRecoveryCode)
  await db.delete(recoveryCodes).where(eq(recoveryCodes.userId, userId))
  await db
    .insert(recoveryCodes)
    .values(codes.map((code) => ({ userId, codeHash: hashRecoveryCode(code) })))
  return codes
}

/**
 * Consume un código de forma atómica: el UPDATE condicionado a `used_at IS NULL`
 * garantiza que dos peticiones simultáneas no puedan usar el mismo código.
 */
export async function consumeRecoveryCode(
  userId: string,
  code: string,
): Promise<boolean> {
  const used = await getDb()
    .update(recoveryCodes)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(recoveryCodes.userId, userId),
        eq(recoveryCodes.codeHash, hashRecoveryCode(code)),
        isNull(recoveryCodes.usedAt),
      ),
    )
    .returning({ id: recoveryCodes.id })
  return used.length > 0
}

export async function countRemainingRecoveryCodes(userId: string): Promise<number> {
  const [row] = await getDb()
    .select({ remaining: count() })
    .from(recoveryCodes)
    .where(and(eq(recoveryCodes.userId, userId), isNull(recoveryCodes.usedAt)))
  return row?.remaining ?? 0
}
