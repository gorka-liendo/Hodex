import { describe, expect, it } from 'vitest'
import {
  base32Decode,
  base32Encode,
  generateTotpSecret,
  hotp,
  totpCode,
  totpUri,
  verifyTotp,
} from './totp.js'

// Secreto de los vectores oficiales del RFC 6238 (Apéndice B), SHA-1.
const RFC_KEY = Buffer.from('12345678901234567890', 'ascii')
const RFC_SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'

describe('base32', () => {
  it('codifica según RFC 4648', () => {
    expect(base32Encode(RFC_KEY)).toBe(RFC_SECRET)
  })

  it('decodifica ignorando mayúsculas, espacios y relleno', () => {
    expect(base32Decode('gezd gnbv gy3t qojq gezd gnbv gy3t qojq====')).toEqual(RFC_KEY)
  })

  it('rechaza caracteres fuera del alfabeto', () => {
    expect(() => base32Decode('GEZ1')).toThrow()
  })
})

describe('TOTP (vectores del RFC 6238)', () => {
  const vectors: Array<[seconds: number, code: string]> = [
    [59, '94287082'],
    [1111111109, '07081804'],
    [1111111111, '14050471'],
    [1234567890, '89005924'],
    [2000000000, '69279037'],
    [20000000000, '65353130'],
  ]

  it.each(vectors)('t=%i → %s (8 dígitos)', (seconds, expected) => {
    expect(hotp(RFC_KEY, Math.floor(seconds / 30), 8)).toBe(expected)
  })

  it.each(vectors)('t=%i → últimos 6 dígitos en modo estándar', (seconds, expected) => {
    expect(totpCode(RFC_SECRET, seconds * 1000)).toBe(expected.slice(-6))
  })
})

describe('verifyTotp', () => {
  const secret = generateTotpSecret()
  const now = 1_790_000_000_000

  it('acepta el código actual y devuelve su paso', () => {
    expect(verifyTotp(secret, totpCode(secret, now), { nowMs: now })).toBe(
      Math.floor(now / 30_000),
    )
  })

  it('tolera ±1 paso de desfase de reloj', () => {
    expect(verifyTotp(secret, totpCode(secret, now - 30_000), { nowMs: now })).not.toBeNull()
    expect(verifyTotp(secret, totpCode(secret, now + 30_000), { nowMs: now })).not.toBeNull()
  })

  it('rechaza códigos fuera de la ventana', () => {
    expect(verifyTotp(secret, totpCode(secret, now - 90_000), { nowMs: now })).toBeNull()
  })

  it('rechaza formatos no válidos', () => {
    for (const code of ['', '12345', '1234567', 'abcdef', '12 345']) {
      expect(verifyTotp(secret, code, { nowMs: now })).toBeNull()
    }
  })
})

describe('generateTotpSecret / totpUri', () => {
  it('genera secretos de 160 bits distintos', () => {
    const a = generateTotpSecret()
    expect(base32Decode(a)).toHaveLength(20)
    expect(generateTotpSecret()).not.toBe(a)
  })

  it('construye una URI otpauth válida', () => {
    const uri = new URL(totpUri(RFC_SECRET, 'yo@hodex.es'))
    expect(uri.protocol).toBe('otpauth:')
    expect(uri.searchParams.get('secret')).toBe(RFC_SECRET)
    expect(uri.searchParams.get('issuer')).toBe('Hodex')
  })
})
