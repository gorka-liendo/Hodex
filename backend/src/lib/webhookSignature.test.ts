import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { verifySvixSignature } from './webhookSignature.js'

const SECRET = `whsec_${Buffer.from('clave-de-pruebas-32-bytes-123456').toString('base64')}`
const body = Buffer.from('{"type":"email.received"}')
const now = 1_790_000_000_000
const ts = String(now / 1000)

const sign = (secret: string, id: string, timestamp: string, payload: Buffer) =>
  createHmac('sha256', Buffer.from(secret.replace('whsec_', ''), 'base64'))
    .update(`${id}.${timestamp}.${payload.toString()}`)
    .digest('base64')

describe('verifySvixSignature', () => {
  it('acepta una firma correcta (también entre varias, durante una rotación)', () => {
    const sig = sign(SECRET, 'msg_1', ts, body)
    expect(verifySvixSignature(SECRET, { id: 'msg_1', timestamp: ts, signature: `v1,${sig}` }, body, now)).toBe(true)
    expect(verifySvixSignature(SECRET, { id: 'msg_1', timestamp: ts, signature: `v1,AAAA v1,${sig}` }, body, now)).toBe(true)
  })

  it('rechaza cuerpo alterado, otro secreto, otro id o falta de cabeceras', () => {
    const sig = `v1,${sign(SECRET, 'msg_1', ts, body)}`
    expect(verifySvixSignature(SECRET, { id: 'msg_1', timestamp: ts, signature: sig }, Buffer.from('{"type":"x"}'), now)).toBe(false)
    expect(verifySvixSignature(`whsec_${Buffer.from('otra').toString('base64')}`, { id: 'msg_1', timestamp: ts, signature: sig }, body, now)).toBe(false)
    expect(verifySvixSignature(SECRET, { id: 'msg_2', timestamp: ts, signature: sig }, body, now)).toBe(false)
    expect(verifySvixSignature(SECRET, { id: 'msg_1', timestamp: ts }, body, now)).toBe(false)
  })

  it('rechaza una firma antigua (más de 5 minutos): no se puede reenviar un webhook capturado', () => {
    const old = String(now / 1000 - 600)
    expect(verifySvixSignature(SECRET, { id: 'msg_1', timestamp: old, signature: `v1,${sign(SECRET, 'msg_1', old, body)}` }, body, now)).toBe(false)
  })
})
