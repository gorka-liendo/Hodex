import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'

// Mock del servicio de email: los tests no deben enviar correos reales.
vi.mock('../../services/email.js', () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}))

import { createApp } from '../../app.js'
import { sendEmail } from '../../services/email.js'

const app = createApp()

/** Payload válido de referencia; cada test sobreescribe lo que necesita. */
const validPayload = {
  name: 'Ana Pérez',
  email: 'ana@example.com',
  company: 'Acme SL',
  message: 'Queremos automatizar la gestión de pedidos.',
  intent: 'automatizar',
  consent: true,
}

beforeEach(() => {
  vi.mocked(sendEmail).mockClear()
  vi.mocked(sendEmail).mockResolvedValue(undefined)
})

describe('GET /api/health', () => {
  it('responde ok', async () => {
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')
  })
})

describe('POST /api/contact', () => {
  it('acepta un envío válido y devuelve 201', async () => {
    const res = await request(app).post('/api/contact').send(validPayload)
    expect(res.status).toBe(201)
    expect(res.body.ok).toBe(true)
  })

  it('envía dos emails: notificación interna y confirmación al remitente', async () => {
    await request(app).post('/api/contact').send(validPayload)

    expect(sendEmail).toHaveBeenCalledTimes(2)

    // 1º: notificación al buzón interno (sin `to` explícito) con reply-to del cliente.
    const notification = vi.mocked(sendEmail).mock.calls[0]![0]!
    expect(notification.to).toBeUndefined()
    expect(notification.replyTo).toBe(validPayload.email)
    expect(notification.text).toContain(validPayload.message)
    expect(notification.text).toContain('Consentimiento: aceptado')

    // 2º: confirmación al remitente.
    const confirmation = vi.mocked(sendEmail).mock.calls[1]![0]!
    expect(confirmation.to).toBe(validPayload.email)
    expect(confirmation.subject).toContain('Hemos recibido tu mensaje')
  })

  it('responde 201 aunque falle la confirmación al remitente', async () => {
    vi.mocked(sendEmail)
      .mockResolvedValueOnce(undefined) // notificación interna OK
      .mockRejectedValueOnce(new Error('Resend caído')) // confirmación falla

    const res = await request(app).post('/api/contact').send(validPayload)
    expect(res.status).toBe(201)
  })

  it('rechaza el envío sin consentimiento (400)', async () => {
    const { consent: _consent, ...withoutConsent } = validPayload
    const res = await request(app).post('/api/contact').send(withoutConsent)
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('ValidationError')
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it('rechaza consent en false (400)', async () => {
    const res = await request(app)
      .post('/api/contact')
      .send({ ...validPayload, consent: false })
    expect(res.status).toBe(400)
  })

  it('rechaza un email inválido (400)', async () => {
    const res = await request(app)
      .post('/api/contact')
      .send({ ...validPayload, email: 'no-es-un-email' })
    expect(res.status).toBe(400)
  })

  it('rechaza el envío sin nombre (400)', async () => {
    const res = await request(app)
      .post('/api/contact')
      .send({ ...validPayload, name: '' })
    expect(res.status).toBe(400)
  })

  it('rechaza una intención desconocida (400)', async () => {
    const res = await request(app)
      .post('/api/contact')
      .send({ ...validPayload, intent: 'hackear' })
    expect(res.status).toBe(400)
  })
})
