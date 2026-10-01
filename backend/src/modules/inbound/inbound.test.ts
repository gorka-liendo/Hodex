import { createHmac, randomUUID } from 'node:crypto'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import { eq } from 'drizzle-orm'

// Recepción y lectura activas con secretos de prueba; Resend y Claude se simulan.
const SECRET = vi.hoisted(() => {
  const secret = `whsec_${Buffer.from('secreto-webhook-de-pruebas-12345').toString('base64')}`
  process.env.RESEND_WEBHOOK_SECRET = secret
  process.env.ANTHROPIC_API_KEY = 'test-key'
  return secret
})
vi.mock('./resendInbound.js', () => ({ listInboundAttachments: vi.fn(), downloadInboundAttachment: vi.fn() }))
vi.mock('../attachments/claudeReader.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../attachments/claudeReader.js')>()),
  readDocumentWithClaude: vi.fn(),
}))

import { createApp } from '../../app.js'
import { closeDb, getDb } from '../../db/client.js'
import { attachments, inboundEmails } from '../../db/schema/index.js'
import { hasTestDatabase, migrateTestDatabase } from '../../test/db.js'
import { signedInPanel } from '../../test/session.js'
import { readDocumentWithClaude } from '../attachments/claudeReader.js'
import { downloadInboundAttachment, listInboundAttachments } from './resendInbound.js'

const app = createApp()
const PDF = Buffer.from('%PDF-1.4\n%%EOF\n')

function webhook(payload: object, secret = SECRET) {
  const body = JSON.stringify(payload)
  const id = `msg_${randomUUID()}`
  const ts = String(Math.floor(Date.now() / 1000))
  const sig = createHmac('sha256', Buffer.from(secret.replace('whsec_', ''), 'base64')).update(`${id}.${ts}.${body}`).digest('base64')
  return request(app)
    .post('/api/inbound/resend')
    .set('Content-Type', 'application/json')
    .set('svix-id', id)
    .set('svix-timestamp', ts)
    .set('svix-signature', `v1,${sig}`)
    .send(body)
}

const received = (from: string, emailId = randomUUID()) => ({
  type: 'email.received',
  created_at: new Date().toISOString(),
  data: { email_id: emailId, from, to: ['facturas@in.hodex.es'], subject: 'Tu factura de octubre', created_at: new Date().toISOString() },
})

async function emailRow(providerEmailId: string) {
  const [row] = await getDb().select().from(inboundEmails).where(eq(inboundEmails.providerEmailId, providerEmailId))
  return row
}

const waitForStatus = (providerEmailId: string, status: string) =>
  vi.waitFor(async () => expect((await emailRow(providerEmailId))?.status).toBe(status), { timeout: 5000 })

describe.skipIf(!hasTestDatabase)('facturas recibidas por email', () => {
  let panel: Awaited<ReturnType<typeof signedInPanel>>
  let supplierEmail: string

  beforeAll(async () => {
    await migrateTestDatabase(getDb())
    panel = await signedInPanel(app)
    supplierEmail = `facturacion-${randomUUID().slice(0, 8)}@proveedor.test`
    await panel
      .post('/contacts', { isClient: false, isSupplier: true, legalName: `Proveedor Email ${randomUUID().slice(0, 6)} SL`, country: 'ES', email: supplierEmail })
      .expect(201)
  })

  afterAll(async () => {
    await closeDb()
  })

  beforeEach(() => {
    vi.mocked(listInboundAttachments).mockReset().mockResolvedValue([
      { id: 'a1', filename: 'factura-octubre.pdf', contentType: 'application/pdf', disposition: 'attachment', size: PDF.length, downloadUrl: 'https://inbound-cdn.resend.com/a1' },
      { id: 'a2', filename: 'logo.png', contentType: 'image/png', disposition: 'inline', size: 2000, downloadUrl: 'https://inbound-cdn.resend.com/a2' },
      { id: 'a3', filename: 'condiciones.docx', contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', disposition: 'attachment', size: 500, downloadUrl: 'https://inbound-cdn.resend.com/a3' },
    ])
    vi.mocked(downloadInboundAttachment).mockReset().mockResolvedValue(PDF)
    vi.mocked(readDocumentWithClaude).mockReset().mockResolvedValue({
      extraction: {
        isExpenseDocument: true,
        supplierName: 'Proveedor Email SL',
        supplierTaxId: null,
        invoiceNumber: 'OCT-1',
        issueDate: '2026-09-30',
        currency: 'EUR',
        totalCents: 2420,
        vatLines: [{ rateBp: 2100, baseCents: 2000, vatCents: 420 }],
        irpfRateBp: null,
        description: 'Servicio de octubre',
        category: 'software',
        warnings: [],
      },
      model: 'claude-test',
      inputTokens: 10,
      outputTokens: 5,
    })
  })

  it('sin firma válida responde 401 y no registra nada', async () => {
    const emailId = randomUUID()
    const res = await webhook(received(supplierEmail, emailId), `whsec_${Buffer.from('otro-secreto').toString('base64')}`)
    expect(res.status).toBe(401)
    expect(await emailRow(emailId)).toBeUndefined()
  })

  it('de un proveedor autorizado: guarda solo el PDF, lo lee y queda por revisar', async () => {
    const emailId = randomUUID()
    await webhook(received(`Proveedor <${supplierEmail.toUpperCase()}>`, emailId)).expect(204)
    await waitForStatus(emailId, 'processed')

    expect(downloadInboundAttachment).toHaveBeenCalledTimes(1) // ni el logo en línea ni el .docx
    const email = (await emailRow(emailId))!
    expect(email).toMatchObject({ fromAddress: supplierEmail, attachmentCount: 1 })

    const inbox = (await panel.get('/inbox').expect(200)).body
    const item = inbox.items.find((i: { id: string }) => i.id === email.id)
    expect(item.pending).toHaveLength(1)
    expect(item.pending[0]).toMatchObject({ filename: 'factura-octubre.pdf', suggestion: { totalCents: 2420, invoiceNumber: 'OCT-1' } })
    expect((await panel.get('/inbox/count').expect(200)).body.pendingCount).toBeGreaterThan(0)

    // Al guardar el gasto con ese justificante, sale de la bandeja.
    await panel
      .post('/expenses', {
        issueDate: '2026-09-30',
        description: 'Servicio de octubre',
        category: 'software',
        totalCents: 2420,
        vatRateBp: 2100,
        attachmentIds: [item.pending[0].id],
      })
      .expect(201)
    const after = (await panel.get('/inbox').expect(200)).body
    expect(after.items.some((i: { id: string }) => i.id === email.id)).toBe(false)
  })

  it('un webhook repetido no duplica el correo', async () => {
    const payload = received(supplierEmail)
    await webhook(payload).expect(204)
    await webhook(payload).expect(204)
    const rows = await getDb().select().from(inboundEmails).where(eq(inboundEmails.providerEmailId, payload.data.email_id))
    expect(rows).toHaveLength(1)
  })

  it('de un remitente desconocido: bloqueado sin descargar nada, hasta que lo aceptes', async () => {
    const emailId = randomUUID()
    await webhook(received('spam@desconocido.test', emailId)).expect(204)
    const email = (await emailRow(emailId))!
    expect(email.status).toBe('blocked')
    expect(listInboundAttachments).not.toHaveBeenCalled()

    await panel.post(`/inbox/${email.id}/accept`).expect(202)
    await waitForStatus(emailId, 'processed')
    expect(downloadInboundAttachment).toHaveBeenCalled()
  })

  it('descartar borra sus adjuntos pendientes', async () => {
    const emailId = randomUUID()
    await webhook(received(supplierEmail, emailId)).expect(204)
    await waitForStatus(emailId, 'processed')
    const email = (await emailRow(emailId))!
    await panel.post(`/inbox/${email.id}/dismiss`).expect(204)
    expect(await getDb().select().from(attachments).where(eq(attachments.inboundEmailId, email.id))).toHaveLength(0)
    expect((await emailRow(emailId))!.status).toBe('dismissed')
  })

  it('si Resend falla, queda como fallido y se puede reintentar', async () => {
    vi.mocked(listInboundAttachments).mockRejectedValueOnce(new Error('Resend API 500'))
    const emailId = randomUUID()
    await webhook(received(supplierEmail, emailId)).expect(204)
    await waitForStatus(emailId, 'failed')
    await panel.post(`/inbox/${(await emailRow(emailId))!.id}/accept`).expect(202)
    await waitForStatus(emailId, 'processed')
  })

  it('otros eventos de Resend se confirman sin hacer nada', async () => {
    await webhook({ type: 'email.delivered', created_at: new Date().toISOString(), data: { email_id: randomUUID(), from: 'x@y.z' } }).expect(204)
  })
})
