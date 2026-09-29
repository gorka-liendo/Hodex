import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto'
import { env } from '../config/env.js'
import { AppError } from './AppError.js'

/** Token aleatorio criptográficamente seguro, apto para cookies y URLs. */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url')
}

/** SHA-256 en hexadecimal. Para tokens de alta entropía (no para contraseñas). */
export function sha256Hex(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex')
}

/**
 * Comparación en tiempo constante. Se comparan los SHA-256 de ambos valores
 * para que tampoco se filtre la longitud del secreto.
 */
export function safeEqual(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a, 'utf8').digest()
  const hb = createHash('sha256').update(b, 'utf8').digest()
  return timingSafeEqual(ha, hb)
}

// ─── Cifrado de secretos en reposo (AES-256-GCM) ────────────────────────────

const CIPHER = 'aes-256-gcm'
const VERSION = 'v1'
const IV_BYTES = 12

function getEncryptionKey(): Buffer {
  if (!env.AUTH_ENCRYPTION_KEY) {
    throw new AppError(503, 'Cifrado no configurado.', {
      code: 'ServiceUnavailable',
    })
  }
  return Buffer.from(env.AUTH_ENCRYPTION_KEY, 'base64')
}

/**
 * Cifra un secreto para guardarlo en la base de datos. `context` se autentica
 * junto al texto cifrado (AAD): un valor cifrado para un usuario no se puede
 * copiar a la fila de otro. Formato: `v1.<iv>.<tag>.<cifrado>` (base64url).
 */
export function encryptSecret(plaintext: string, context: string): string {
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(CIPHER, getEncryptionKey(), iv)
  cipher.setAAD(Buffer.from(context, 'utf8'))
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])
  const tag = cipher.getAuthTag()
  return [VERSION, iv, tag, ciphertext]
    .map((part) => (typeof part === 'string' ? part : part.toString('base64url')))
    .join('.')
}

/** Descifra un valor de `encryptSecret`. Lanza si fue manipulado. */
export function decryptSecret(payload: string, context: string): string {
  const [version, iv, tag, ciphertext] = payload.split('.')
  if (version !== VERSION || !iv || !tag || !ciphertext) {
    throw new Error('Formato de secreto cifrado no válido')
  }
  const decipher = createDecipheriv(
    CIPHER,
    getEncryptionKey(),
    Buffer.from(iv, 'base64url'),
  )
  decipher.setAAD(Buffer.from(context, 'utf8'))
  decipher.setAuthTag(Buffer.from(tag, 'base64url'))
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, 'base64url')),
    decipher.final(),
  ]).toString('utf8')
}
