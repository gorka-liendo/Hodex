import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { eq } from 'drizzle-orm'

// Clave falsa antes de cargar la configuración; Claude se simula siempre.
vi.hoisted(() => {
  process.env.ANTHROPIC_API_KEY = 'test-key'
})
vi.mock('./claudeReader.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./claudeReader.js')>()),
  readDocumentWithClaude: vi.fn(),
}))

import { createApp } from '../../app.js'
import { closeDb, getDb } from '../../db/client.js'
import { attachments, auditLog, sessions } from '../../db/schema/index.js'
import { hasTestDatabase, migrateTestDatabase } from '../../test/db.js'
import { signedInPanel } from '../../test/session.js'
import { readDocumentWithClaude, type RawExtraction } from './claudeReader.js'

const app = createApp()

const PDF = Buffer.from('%PDF-1.4\n1 0 obj << >> endobj\ntrailer << >>\n%%EOF\n')
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32)])

const extraction = (override: Partial<RawExtraction> = {}): RawExtraction => ({
  isExpenseDocument: true,
  supplierName: 'Proveedor Test SL',
  supplierTaxId: null,
  invoiceNumber: 'T-001',
  issueDate: '2026-09-25',
  currency: 'EUR',
  totalCents: 1210,
  vatLines: [{ rateBp: 2100, baseCents: 1000, vatCents: 210 }],
  irpfRateBp: null,
  description: 'Hosting septiembre',
  category: 'software',
  warnings: [],
  ...override,
})

describe.skipIf(!hasTestDatabase)('adjuntos de gastos', () => {
  let panel: Awaited<ReturnType<typeof signedInPanel>>

  const expenseBody = (override: object = {}) => ({
    issueDate: '2026-09-25',
    description: 'Hosting',
    category: 'software',
    totalCents: 1210,
    vatRateBp: 2100,
    ...override,
  })

  beforeAll(async () => {
    await migrateTestDatabase(getDb())
    panel = await signedInPanel(app)
  })

  afterAll(async () => {
    await closeDb()
  })

  beforeEach(() => {
    vi.mocked(readDocumentWithClaude).mockReset()
    vi.mocked(readDocumentWithClaude).mockResolvedValue({
      extraction: extraction(),
      model: 'claude-test',
      inputTokens: 1000,
      outputTokens: 200,
    })
  })

  describe('subida', () => {
    it('guarda el archivo con el tipo real y lo sirve igual', async () => {
      const res = await panel.upload('/attachments', PDF, 'Factura señal.pdf')
      expect(res.status).toBe(201)
      expect(res.body).toMatchObject({ filename: 'Factura señal.pdf', contentType: 'application/pdf', sizeBytes: PDF.length, expenseId: null })
      expect(res.body.data).toBeUndefined()

      const file = await panel.get(`/attachments/${res.body.id}/file`).buffer(true).parse((r, cb) => {
        const chunks: Buffer[] = []
        r.on('data', (c: Buffer) => chunks.push(c))
        r.on('end', () => cb(null, Buffer.concat(chunks)))
      })
      expect(file.status).toBe(200)
      expect(file.headers['content-type']).toBe('application/pdf')
      expect(file.headers['x-content-type-options']).toBe('nosniff')
      expect(file.headers['content-disposition']).toContain("filename*=UTF-8''Factura%20se%C3%B1al.pdf")
      expect(Buffer.compare(file.body as Buffer, PDF)).toBe(0)
    })

    it('rechaza lo que no es PDF ni imagen aunque se llame .pdf', async () => {
      const res = await panel.upload('/attachments', Buffer.from('<html><script>alert(1)</script></html>'), 'ticket.pdf')
      expect(res.status).toBe(415)
      expect(res.body.error).toBe('UnsupportedFile')
    })

    it('rechaza archivos de más de 10 MB', async () => {
      const big = Buffer.concat([PDF, Buffer.alloc(10 * 1024 * 1024)])
      const res = await panel.upload('/attachments', big, 'grande.pdf')
      expect(res.status).toBe(413)
    })

    it('un JSON mal formado da 400, no 500', async () => {
      const res = await panel.post('/expenses').set('Content-Type', 'application/json').send('{"roto":')
      expect(res.status).toBe(400)
    })
  })

  describe('vinculación con el gasto', () => {
    it('el gasto muestra sus adjuntos y no se puede robar el de otro', async () => {
      const file = (await panel.upload('/attachments', PNG, 'ticket.png')).body
      const expense = (await panel.post('/expenses', expenseBody({ attachmentIds: [file.id] }))).body
      expect(expense.attachments.map((a: { id: string }) => a.id)).toEqual([file.id])

      const other = await panel.post('/expenses', expenseBody({ attachmentIds: [file.id] }))
      expect(other.status).toBe(400)
      expect(other.body.details[0].path).toEqual(['attachmentIds'])

      const missing = await panel.post('/expenses', expenseBody({ attachmentIds: [randomUUID()] }))
      expect(missing.status).toBe(400)
    })

    it('se pueden añadir justificantes a un gasto ya guardado', async () => {
      const expense = (await panel.post('/expenses', expenseBody())).body
      expect(expense.attachments).toEqual([])
      const file = (await panel.upload('/attachments', PDF, 'factura.pdf')).body
      const res = await panel.post(`/expenses/${expense.id}/attachments`, { attachmentIds: [file.id] })
      expect(res.status).toBe(200)
      expect(res.body.attachments).toHaveLength(1)
    })

    it('borrar un adjunto suelto es libre; uno vinculado exige 2FA reciente', async () => {
      const loose = (await panel.upload('/attachments', PNG, 'error.png')).body
      await panel.delete(`/attachments/${loose.id}`).expect(204)

      const kept = (await panel.upload('/attachments', PNG, 'ticket.png')).body
      await panel.post('/expenses', expenseBody({ attachmentIds: [kept.id] })).expect(201)
      await getDb()
        .update(sessions)
        .set({ reauthenticatedAt: new Date(Date.now() - 11 * 60_000) })
        .where(eq(sessions.id, panel.sessionId))
      const res = await panel.delete(`/attachments/${kept.id}`)
      expect(res.status).toBe(403)
      expect(res.body.error).toBe('ReauthRequired')
      await getDb().update(sessions).set({ reauthenticatedAt: new Date() }).where(eq(sessions.id, panel.sessionId))
      await panel.delete(`/attachments/${kept.id}`).expect(204)
    })

    it('los adjuntos abandonados de más de un día se limpian solos', async () => {
      const old = (await panel.upload('/attachments', PNG, 'viejo.png')).body
      await getDb()
        .update(attachments)
        .set({ createdAt: new Date(Date.now() - 25 * 60 * 60_000) })
        .where(eq(attachments.id, old.id))
      await panel.upload('/attachments', PNG, 'nuevo.png').expect(201)
      expect(await getDb().select({ id: attachments.id }).from(attachments).where(eq(attachments.id, old.id))).toHaveLength(0)
    })
  })

  describe('lectura con IA', () => {
    it('propone los datos, la guarda y no vuelve a pagar por el mismo archivo', async () => {
      const file = (await panel.upload('/attachments', PDF, 'hosting.pdf')).body
      const res = await panel.post(`/attachments/${file.id}/extract`)
      expect(res.status).toBe(200)
      expect(res.body).toMatchObject({
        totalCents: 1210,
        vatRateBp: 2100,
        irpfRateBp: 0,
        category: 'software',
        description: 'Hosting septiembre',
        supplier: { name: 'Proveedor Test SL', taxId: null },
        supplierId: null,
      })

      await panel.post(`/attachments/${file.id}/extract`).expect(200)
      expect(readDocumentWithClaude).toHaveBeenCalledTimes(1)
      await panel.post(`/attachments/${file.id}/extract?force=true`).expect(200)
      expect(readDocumentWithClaude).toHaveBeenCalledTimes(2)

      const audit = await getDb().select().from(auditLog).where(eq(auditLog.action, 'attachment.extract'))
      expect(audit.some((a) => (a.metadata as { attachmentId?: string }).attachmentId === file.id)).toBe(true)
    })

    it('reconoce un proveedor ya registrado por su NIF', async () => {
      const taxId = 'B12345674'
      const contact = await panel.post('/contacts', {
        isClient: false,
        isSupplier: true,
        legalName: `Proveedor ${randomUUID().slice(0, 6)} SL`,
        country: 'ES',
        taxId,
      })
      expect(contact.status).toBe(201)
      vi.mocked(readDocumentWithClaude).mockResolvedValue({
        extraction: extraction({ supplierTaxId: 'ES-B-12345674' }),
        model: 'claude-test',
        inputTokens: 1,
        outputTokens: 1,
      })
      const file = (await panel.upload('/attachments', PDF, 'f.pdf')).body
      const res = await panel.post(`/attachments/${file.id}/extract`)
      expect(res.body.supplierId).toBe(contact.body.id)
      await panel.post(`/contacts/${contact.body.id}/archive`)
    })

    it('si Claude falla, avisa (502) sin guardar una lectura', async () => {
      vi.mocked(readDocumentWithClaude).mockRejectedValueOnce(new Error('overloaded'))
      const file = (await panel.upload('/attachments', PDF, 'f.pdf')).body
      const res = await panel.post(`/attachments/${file.id}/extract`)
      expect(res.status).toBe(502)
      expect(res.body.error).toBe('AiFailed')
      const [row] = await getDb().select({ extraction: attachments.extraction }).from(attachments).where(eq(attachments.id, file.id))
      expect(row!.extraction).toBeNull()
    })
  })
})
