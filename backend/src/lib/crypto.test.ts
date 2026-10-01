import { describe, expect, it } from 'vitest'
import { decryptSecret, encryptSecret, randomToken, safeEqual, sha256Hex } from './crypto.js'

describe('randomToken / sha256Hex / safeEqual', () => {
  it('genera tokens de 256 bits únicos en base64url', () => {
    const token = randomToken()
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(randomToken()).not.toBe(token)
  })

  it('sha256Hex es determinista', () => {
    expect(sha256Hex('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    )
  })

  it('safeEqual compara también valores de distinta longitud', () => {
    expect(safeEqual('secreto', 'secreto')).toBe(true)
    expect(safeEqual('secreto', 'secret')).toBe(false)
    expect(safeEqual('', 'x')).toBe(false)
  })
})

describe('encryptSecret / decryptSecret (AES-256-GCM)', () => {
  it('descifra lo que cifra', () => {
    const payload = encryptSecret('JBSWY3DPEHPK3PXP', 'user:1')
    expect(payload.startsWith('v1.')).toBe(true)
    expect(decryptSecret(payload, 'user:1')).toBe('JBSWY3DPEHPK3PXP')
  })

  it('usa un IV nuevo cada vez', () => {
    expect(encryptSecret('x', 'c')).not.toBe(encryptSecret('x', 'c'))
  })

  it('falla si el contexto no coincide (no se puede mover a otro usuario)', () => {
    const payload = encryptSecret('secreto', 'user:1')
    expect(() => decryptSecret(payload, 'user:2')).toThrow()
  })

  it('falla si el texto cifrado se manipula', () => {
    const [v, iv, tag, ct] = encryptSecret('secreto', 'c').split('.')
    const flipped = Buffer.from(ct!, 'base64url')
    flipped[0]! ^= 1
    expect(() =>
      decryptSecret([v, iv, tag, flipped.toString('base64url')].join('.'), 'c'),
    ).toThrow()
  })

  it('rechaza formatos desconocidos', () => {
    expect(() => decryptSecret('v2.a.b.c', 'c')).toThrow()
    expect(() => decryptSecret('basura', 'c')).toThrow()
  })
})
