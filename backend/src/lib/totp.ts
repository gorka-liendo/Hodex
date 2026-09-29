import { createHmac, randomBytes } from 'node:crypto'
import { safeEqual } from './crypto.js'

/**
 * TOTP (RFC 6238) compatible con Google Authenticator, 1Password, Authy…:
 * HMAC-SHA1, 6 dígitos, pasos de 30 s. Implementación propia (verificada con
 * los vectores del RFC en los tests) porque necesitamos saber QUÉ paso se usó
 * para impedir que un mismo código se acepte dos veces.
 */
export const TOTP_PERIOD_SECONDS = 30
export const TOTP_DIGITS = 6

// ─── Base32 (RFC 4648), el formato estándar de los secretos TOTP ────────────

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

export function base32Encode(data: Buffer): string {
  let bits = 0
  let value = 0
  let output = ''
  for (const byte of data) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) output += BASE32_ALPHABET[(value << (5 - bits)) & 31]
  return output
}

export function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/[\s=-]/g, '')
  let bits = 0
  let value = 0
  const bytes: number[] = []
  for (const char of clean) {
    const index = BASE32_ALPHABET.indexOf(char)
    if (index === -1) throw new Error('Secreto base32 no válido')
    value = (value << 5) | index
    bits += 5
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255)
      bits -= 8
    }
  }
  return Buffer.from(bytes)
}

// ─── TOTP ────────────────────────────────────────────────────────────────────

/** Secreto nuevo de 160 bits (lo recomendado por el RFC para HMAC-SHA1). */
export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20))
}

/** Paso de tiempo (ventana de 30 s) correspondiente a un instante. */
export function totpStep(nowMs: number = Date.now()): number {
  return Math.floor(nowMs / 1000 / TOTP_PERIOD_SECONDS)
}

/** Código HOTP de un paso concreto (RFC 4226 §5.3). */
export function hotp(key: Buffer, counter: number, digits = TOTP_DIGITS): string {
  const message = Buffer.alloc(8)
  message.writeBigUInt64BE(BigInt(counter))
  const hmac = createHmac('sha1', key).update(message).digest()
  const offset = hmac[hmac.length - 1]! & 0x0f
  const binary = hmac.readUInt32BE(offset) & 0x7fffffff
  return (binary % 10 ** digits).toString().padStart(digits, '0')
}

/** Código TOTP vigente para un secreto base32. */
export function totpCode(secret: string, nowMs: number = Date.now()): string {
  return hotp(base32Decode(secret), totpStep(nowMs))
}

/**
 * Verifica un código aceptando ±`window` pasos de desfase de reloj. Devuelve
 * el paso que coincide (para registrarlo y bloquear su reutilización) o null.
 * Recorre siempre toda la ventana para no filtrar información por tiempos.
 */
export function verifyTotp(
  secret: string,
  code: string,
  { nowMs = Date.now(), window = 1 }: { nowMs?: number; window?: number } = {},
): number | null {
  if (!/^\d{6}$/.test(code)) return null
  const key = base32Decode(secret)
  const current = totpStep(nowMs)
  let matched: number | null = null
  for (let offset = -window; offset <= window; offset++) {
    const step = current + offset
    if (safeEqual(hotp(key, step), code)) matched = step
  }
  return matched
}

/** URI `otpauth://` que las apps de autenticación leen desde un QR. */
export function totpUri(secret: string, account: string, issuer = 'Hodex'): string {
  const label = encodeURIComponent(`${issuer}:${account}`)
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: String(TOTP_DIGITS),
    period: String(TOTP_PERIOD_SECONDS),
  })
  return `otpauth://totp/${label}?${params.toString()}`
}
