import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import { and, eq, sql } from 'drizzle-orm'

// Los envíos reales se simulan: los tests nunca mandan emails.
vi.mock('../../../services/email.js', () => ({
  sendEmail: vi.fn().mockResolvedValue({ id: 'resend-test-id' }),
}))

import { createApp } from '../../../app.js'
import { closeDb, getDb } from '../../../db/client.js'
import { auditLog, invoiceSends, invoiceShareLinks } from '../../../db/schema/index.js'
import { sha256Hex } from '../../../lib/crypto.js'
import { todayInSpain } from '../../../lib/periods.js'
import { sendEmail } from '../../../services/email.js'
import { hasTestDatabase, migrateTestDatabase } from '../../../test/db.js'
import { signedInPanel } from '../../../test/session.js'

const app = createApp()

/** Supertest: cuerpo binario (PDF). */
const binary = (res: request.Response, callback: (err: Error | null, body: Buffer) => void) => {
  const chunks: Buffer[] = []
  res.on('data', (chunk: Buffer) => chunks.push(chunk))
  res.on('end', () => callback(null, Buffer.concat(chunks)))
}

describe.skipIf(!hasTestDatabase)('envío de facturas', () => {
  let panel: Awaited<ReturnType<typeof signedInPanel>>
  let clientId: string

  async function issued() {
    const draft = (
      await panel.post('/invoices', {
        clientId,
        issueDate: todayInSpain(),
        lines: [{ description: 'Diseño web', quantityMilli: 1_000, unitPriceCents: 100_000, vatRateBp: 2100 }],
      })
    ).body
    return (await panel.post(`/invoices/${draft.id}/issue`).expect(200)).body
  }

  const emailBody = (override: object = {}) => ({
    to: 'cliente@example.com',
    subject: 'Factura de Hodex',
    message: 'Hola,\n\nTe adjuntamos la factura.',
    ...override,
  })

  beforeAll(async () => {
    await migrateTestDatabase(getDb())
    panel = await signedInPanel(app)
    await panel
      .put('/settings/company', {
        legalName: 'Hodex Studio SL',
        tradeName: 'Hodex',
        taxId: 'B12345674',
        addressLine: 'Calle Mayor 1',
        postalCode: '48001',
        city: 'Bilbao',
        country: 'ES',
        email: 'team@hodex.es',
      })
      .expect(200)
    clientId = (
      await panel.post('/contacts', {
        isClient: true,
        isSupplier: false,
        legalName: `Cliente Envíos ${randomUUID().slice(0, 6)} SL`,
        country: 'FR',
        taxId: `FR${Date.now()}`,
        addressLine: '1 Rue',
        city: 'Paris',
      })
    ).body.id
  })

  afterAll(async () => {
    await closeDb()
  })

  beforeEach(() => {
    vi.mocked(sendEmail).mockClear()
    vi.mocked(sendEmail).mockResolvedValue({ id: 'resend-test-id' })
  })

  describe('por email', () => {
    it('envía el PDF adjunto, responde a la empresa y registra el envío', async () => {
      const invoice = await issued()
      const res = await panel.post(`/invoices/${invoice.id}/send/email`, emailBody({ cc: ['Socio@Example.com'] }))
      expect(res.status).toBe(201)
      expect(res.body).toMatchObject({ channel: 'email', recipient: 'cliente@example.com', providerMessageId: 'resend-test-id' })

      const message = vi.mocked(sendEmail).mock.calls[0]![0]!
      expect(message).toMatchObject({ to: 'cliente@example.com', cc: ['socio@example.com'], replyTo: 'team@hodex.es' })
      const [attachment] = message.attachments!
      expect(attachment!.filename).toBe(`${invoice.fullNumber}.pdf`)
      expect(attachment!.content.subarray(0, 5).toString()).toBe('%PDF-')

      const audit = await getDb()
        .select()
        .from(auditLog)
        .where(and(eq(auditLog.action, 'invoice.send.email'), sql`${auditLog.metadata}->>'invoiceId' = ${invoice.id}`))
      expect(audit).toHaveLength(1)
    })

    it('escapa el mensaje en el HTML del email', async () => {
      const invoice = await issued()
      await panel.post(`/invoices/${invoice.id}/send/email`, emailBody({ message: '<script>alert(1)</script>' })).expect(201)
      const html = vi.mocked(sendEmail).mock.calls[0]![0]!.html!
      expect(html).not.toContain('<script>')
      expect(html).toContain('&lt;script&gt;')
    })

    it.each([
      ['un borrador', 'draft'],
      ['un asunto con salto de línea', 'subject'],
      ['un email inválido', 'email'],
    ])('rechaza %s', async (_label, kind) => {
      if (kind === 'draft') {
        const draft = (await panel.post('/invoices', { clientId, issueDate: todayInSpain(), lines: [] })).body
        expect((await panel.post(`/invoices/${draft.id}/send/email`, emailBody())).status).toBe(409)
        return
      }
      const invoice = await issued()
      const body = kind === 'subject' ? emailBody({ subject: 'Hola\nBcc: espia@x.com' }) : emailBody({ to: 'no-es-email' })
      expect((await panel.post(`/invoices/${invoice.id}/send/email`, body)).status).toBe(400)
      expect(sendEmail).not.toHaveBeenCalled()
    })

    it('si el proveedor falla, avisa (502) y no registra un envío falso', async () => {
      vi.mocked(sendEmail).mockRejectedValueOnce(new Error('Resend caído'))
      const invoice = await issued()
      const res = await panel.post(`/invoices/${invoice.id}/send/email`, emailBody())
      expect(res.status).toBe(502)
      expect(res.body.error).toBe('EmailFailed')
      const sends = await getDb().select().from(invoiceSends).where(eq(invoiceSends.invoiceId, invoice.id))
      expect(sends).toHaveLength(0)
    })
  })

  describe('por WhatsApp (enlace)', () => {
    async function share(invoiceId: string) {
      const res = await panel.post(`/invoices/${invoiceId}/send/whatsapp`, { phone: '+34 600 000 000' })
      expect(res.status).toBe(201)
      const token = /\/api\/f\/([A-Za-z0-9_-]{43})$/.exec(res.body.url)![1]!
      return { ...res.body, token }
    }

    it('crea un enlace que abre el PDF, lo cuenta y lo audita', async () => {
      const invoice = await issued()
      const link = await share(invoice.id)
      expect(link.text).toContain(invoice.fullNumber)
      expect(link.text).toContain(link.url)

      const res = await request(app).get(`/api/f/${link.token}`).buffer(true).parse(binary)
      expect(res.status).toBe(200)
      expect(res.headers['content-type']).toBe('application/pdf')
      expect(res.headers['content-disposition']).toBe(`inline; filename="${invoice.fullNumber}.pdf"`)
      expect(res.headers['x-robots-tag']).toContain('noindex')
      expect((res.body as Buffer).subarray(0, 5).toString()).toBe('%PDF-')

      const [row] = await getDb().select().from(invoiceShareLinks).where(eq(invoiceShareLinks.id, sha256Hex(link.token)))
      expect(row!.accessCount).toBe(1)
      const opens = await getDb()
        .select()
        .from(auditLog)
        .where(and(eq(auditLog.action, 'invoice.link.open'), sql`${auditLog.metadata}->>'invoiceId' = ${invoice.id}`))
      expect(opens).toHaveLength(1)
    })

    it('en la BD solo queda el hash del token', async () => {
      const invoice = await issued()
      const link = await share(invoice.id)
      const rows = await getDb().select().from(invoiceShareLinks).where(eq(invoiceShareLinks.invoiceId, invoice.id))
      expect(rows.map((r) => r.id)).toEqual([sha256Hex(link.token)])
      expect(JSON.stringify(rows)).not.toContain(link.token)
    })

    it('revocado, caducado o inventado: el mismo 404 sin pistas', async () => {
      const invoice = await issued()
      const revoked = await share(invoice.id)
      const expired = await share(invoice.id)

      await panel.post(`/invoices/${invoice.id}/links/${sha256Hex(revoked.token)}/revoke`).expect(204)
      await getDb()
        .update(invoiceShareLinks)
        .set({ createdAt: new Date(Date.now() - 10 * 86_400_000), expiresAt: new Date(Date.now() - 86_400_000) })
        .where(eq(invoiceShareLinks.id, sha256Hex(expired.token)))

      const bodies = new Set<string>()
      for (const token of [revoked.token, expired.token, 'A'.repeat(43), 'corto']) {
        const res = await request(app).get(`/api/f/${token}`)
        expect(res.status).toBe(404)
        bodies.add(res.text)
      }
      expect(bodies.size).toBe(1)
    })

    it('la ficha lista envíos y enlaces, nunca tokens', async () => {
      const invoice = await issued()
      const link = await share(invoice.id)
      const res = await panel.get(`/invoices/${invoice.id}/sharing`)
      expect(res.body.sends.map((s: { channel: string }) => s.channel)).toContain('whatsapp')
      expect(res.body.links).toHaveLength(1)
      expect(JSON.stringify(res.body)).not.toContain(link.token)
    })

    it('no se comparte un borrador', async () => {
      const draft = (await panel.post('/invoices', { clientId, issueDate: todayInSpain(), lines: [] })).body
      expect((await panel.post(`/invoices/${draft.id}/send/whatsapp`, {})).status).toBe(409)
    })
  })
})
