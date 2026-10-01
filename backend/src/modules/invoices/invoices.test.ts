import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { and, eq, sql } from 'drizzle-orm'
import { createApp } from '../../app.js'
import { closeDb, getDb } from '../../db/client.js'
import { auditLog, invoiceCounters, invoiceLines, invoices, sessions } from '../../db/schema/index.js'
import { addDays, todayInSpain } from '../../lib/periods.js'
import { hasTestDatabase, migrateTestDatabase } from '../../test/db.js'
import { signedInPanel } from '../../test/session.js'

const app = createApp()
type Panel = Awaited<ReturnType<typeof signedInPanel>>

const COMPANY = {
  legalName: 'Hodex Studio SL',
  tradeName: 'Hodex',
  taxId: 'B12345674',
  addressLine: 'Calle Mayor 1',
  postalCode: '48001',
  city: 'Bilbao',
  province: 'Bizkaia',
  country: 'ES',
  email: 'team@hodex.es',
  phone: '',
  iban: 'ES91 2100 0418 4502 0005 1332',
  paymentTermDays: 30,
  invoiceFooter: '',
}

describe.skipIf(!hasTestDatabase)('facturación', () => {
  let panel: Panel
  let clientId: string
  let clientWithoutTaxId: string
  const today = todayInSpain()

  const draft = (override: object = {}) => ({
    clientId,
    issueDate: today,
    irpfRateBp: 1500,
    notes: 'Gracias por confiar en Hodex',
    lines: [
      { description: 'Diseño de producto (horas)', quantityMilli: 10_000, unitPriceCents: 6_000, vatRateBp: 2100 },
      { description: 'Hosting anual', quantityMilli: 1_000, unitPriceCents: 12_000, vatRateBp: 2100 },
    ],
    ...override,
  })

  async function issuedInvoice(override: object = {}) {
    const created = (await panel.post('/invoices', draft(override))).body
    const res = await panel.post(`/invoices/${created.id}/issue`)
    expect(res.status).toBe(200)
    return res.body
  }

  beforeAll(async () => {
    await migrateTestDatabase(getDb())
    panel = await signedInPanel(app)
    await panel.put('/settings/company', COMPANY).expect(200)
    clientId = (
      await panel.post('/contacts', {
        isClient: true,
        isSupplier: false,
        legalName: `Cliente Factura ${randomUUID().slice(0, 6)} SL`,
        country: 'FR', // NIF extranjero: no se valida con reglas españolas
        taxId: `FR${Date.now()}`,
        addressLine: '1 Rue de Rivoli',
        postalCode: '75001',
        city: 'Paris',
      })
    ).body.id
    clientWithoutTaxId = (
      await panel.post('/contacts', { isClient: true, isSupplier: false, legalName: 'Sin NIF', country: 'ES' })
    ).body.id
  })

  afterAll(async () => {
    await closeDb()
  })

  describe('datos de la empresa', () => {
    it('valida el IBAN con su dígito de control', async () => {
      const res = await panel.put('/settings/company', { ...COMPANY, iban: 'ES9121000418450200051333' })
      expect(res.status).toBe(400)
      expect(res.body.issues[0].path).toEqual(['iban'])
    })

    it('cambiarlos exige 2FA reciente (protege el IBAN de cobro)', async () => {
      await getDb()
        .update(sessions)
        .set({ reauthenticatedAt: new Date(Date.now() - 60 * 60_000) })
        .where(eq(sessions.id, panel.sessionId))
      expect((await panel.put('/settings/company', COMPANY)).status).toBe(403)
      await getDb().update(sessions).set({ reauthenticatedAt: new Date() }).where(eq(sessions.id, panel.sessionId))
    })

    it('guarda normalizando NIF e IBAN y avisa de lo que falta para facturar', async () => {
      const res = await panel.put('/settings/company', COMPANY)
      expect(res.body).toMatchObject({ iban: 'ES9121000418450200051332', missingForInvoicing: [] })
      const partial = await panel.get('/settings/company')
      expect(partial.body.missingForInvoicing).toEqual([])
    })
  })

  describe('borradores', () => {
    it('calcula líneas, IVA por tipo, retención y total en el servidor', async () => {
      const res = await panel.post('/invoices', draft())
      expect(res.status).toBe(201)
      expect(res.body).toMatchObject({
        status: 'draft',
        fullNumber: null,
        baseCents: 72_000,
        vatCents: 15_120,
        irpfCents: 10_800,
        totalCents: 76_320,
        vatBreakdown: [{ rateBp: 2100, baseCents: 72_000, vatCents: 15_120 }],
      })
      expect(res.body.lines.map((l: { baseCents: number }) => l.baseCents)).toEqual([60_000, 12_000])
    })

    it('no acepta importes calculados enviados por el cliente', async () => {
      expect((await panel.post('/invoices', { ...draft(), totalCents: 1 })).status).toBe(400)
    })

    it('solo admite como cliente un contacto marcado como cliente', async () => {
      const supplier = (
        await panel.post('/contacts', { isClient: false, isSupplier: true, legalName: 'Solo proveedor', country: 'ES' })
      ).body.id
      const res = await panel.post('/invoices', draft({ clientId: supplier }))
      expect(res.status).toBe(400)
      expect(res.body.details[0].path).toEqual(['clientId'])
    })

    it('se editan reemplazando las líneas, y se pueden borrar', async () => {
      const created = (await panel.post('/invoices', draft())).body
      const updated = await panel.put(`/invoices/${created.id}`, draft({ lines: [draft().lines[1]] }))
      expect(updated.body.lines).toHaveLength(1)
      expect(updated.body.baseCents).toBe(12_000)
      expect((await panel.delete(`/invoices/${created.id}`)).status).toBe(204)
      expect((await panel.get(`/invoices/${created.id}`)).status).toBe(404)
    })
  })

  describe('emisión', () => {
    it('explica qué falta si no se puede emitir', async () => {
      const created = (await panel.post('/invoices', draft({ clientId: clientWithoutTaxId, lines: [] }))).body
      const res = await panel.post(`/invoices/${created.id}/issue`)
      expect(res.status).toBe(422)
      expect(res.body.error).toBe('CannotIssue')
      const messages = res.body.details.map((d: { message: string }) => d.message).join(' ')
      expect(messages).toMatch(/NIF/)
      expect(messages).toMatch(/dirección/)
      expect(messages).toMatch(/líneas/)
    })

    it('no admite fechas futuras', async () => {
      const created = (await panel.post('/invoices', draft({ issueDate: addDays(today, 1) }))).body
      expect((await panel.post(`/invoices/${created.id}/issue`)).status).toBe(422)
    })

    it('asigna número correlativo, congela datos, vence según el plazo y encadena la huella', async () => {
      const first = await issuedInvoice()
      const second = await issuedInvoice()

      const year = today.slice(0, 4)
      expect(first.fullNumber).toMatch(new RegExp(`^F-${year}-\\d{4}$`))
      expect(second.number).toBe(first.number + 1)
      expect(second.previousHash).toBe(first.hash)
      expect(first.hash).toMatch(/^[0-9A-F]{64}$/)
      expect(first.dueDate).toBe(addDays(today, 30))
      expect(first.issuerSnapshot).toMatchObject({ legalName: 'Hodex Studio SL', iban: 'ES9121000418450200051332' })
      expect(first.clientSnapshot.city).toBe('Paris')

      // Cambiar el cliente después NO altera la factura emitida.
      await panel.put(`/contacts/${clientId}`, {
        isClient: true,
        isSupplier: false,
        legalName: 'Nombre Nuevo SA',
        country: 'FR',
        taxId: first.clientSnapshot.taxId,
        addressLine: 'Otra calle',
        city: 'Lyon',
      })
      const reread = await panel.get(`/invoices/${first.id}`)
      expect(reread.body.clientSnapshot).toMatchObject({ legalName: first.clientSnapshot.legalName, city: 'Paris' })
    })

    it('emisiones simultáneas: números únicos y consecutivos, sin huecos', async () => {
      const drafts = await Promise.all(Array.from({ length: 5 }, () => panel.post('/invoices', draft())))
      const results = await Promise.all(drafts.map((d) => panel.post(`/invoices/${d.body.id}/issue`)))
      expect(results.map((r) => r.status)).toEqual([200, 200, 200, 200, 200])
      const numbers = results.map((r) => r.body.number as number).sort((a, b) => a - b)
      expect(new Set(numbers).size).toBe(5)
      expect(numbers[4]! - numbers[0]!).toBe(4)
    })

    it('un intento fallido no consume número', async () => {
      const year = Number(today.slice(0, 4))
      const counter = async () =>
        (await getDb().select().from(invoiceCounters).where(and(eq(invoiceCounters.series, 'F'), eq(invoiceCounters.year, year))))[0]!
          .lastNumber
      const before = await counter()
      const bad = (await panel.post('/invoices', draft({ lines: [] }))).body
      await panel.post(`/invoices/${bad.id}/issue`).expect(422)
      expect(await counter()).toBe(before)
      expect((await issuedInvoice()).number).toBe(before + 1)
    })

    it('la cadena de huellas completa es verificable', async () => {
      const res = await panel.get('/invoices/chain/verify')
      expect(res.body).toMatchObject({ valid: true, brokenAt: null })
      expect(res.body.checked).toBeGreaterThan(0)
    })
  })

  describe('inmutabilidad de una factura emitida', () => {
    it('la API no permite editarla ni borrarla', async () => {
      const invoice = await issuedInvoice()
      expect((await panel.put(`/invoices/${invoice.id}`, draft())).status).toBe(409)
      expect((await panel.delete(`/invoices/${invoice.id}`)).status).toBe(409)
      expect((await panel.post(`/invoices/${invoice.id}/issue`)).status).toBe(409)
    })

    it('la BASE DE DATOS la protege aunque se salte la aplicación', async () => {
      const invoice = await issuedInvoice()
      const db = getDb()
      await expect(db.update(invoices).set({ totalCents: 1, baseCents: 1, vatCents: 0, irpfCents: 0 }).where(eq(invoices.id, invoice.id))).rejects.toThrow()
      await expect(db.update(invoices).set({ notes: 'retocada' }).where(eq(invoices.id, invoice.id))).rejects.toThrow()
      await expect(db.delete(invoices).where(eq(invoices.id, invoice.id))).rejects.toThrow()
      await expect(db.update(invoiceLines).set({ unitPriceCents: 1 }).where(eq(invoiceLines.invoiceId, invoice.id))).rejects.toThrow()
      await expect(db.delete(invoiceLines).where(eq(invoiceLines.invoiceId, invoice.id))).rejects.toThrow()
      await expect(
        db.insert(invoiceLines).values({
          invoiceId: invoice.id,
          position: 99,
          description: 'colada',
          quantityMilli: 1000,
          unitPriceCents: 1,
          vatRateBp: 0,
          baseCents: 1,
        }),
      ).rejects.toThrow()
      // Lo único permitido: registrar el cobro.
      await db.update(invoices).set({ paidOn: today }).where(eq(invoices.id, invoice.id))
    })

    it('una alteración (con los triggers desactivados) se detecta en la cadena', async () => {
      const invoice = await issuedInvoice()
      const db = getDb()
      await db.execute(sql`ALTER TABLE invoices DISABLE TRIGGER invoices_guard_issued`)
      try {
        await db.update(invoices).set({ issueDate: '2020-01-01' }).where(eq(invoices.id, invoice.id))
        const res = await panel.get('/invoices/chain/verify')
        expect(res.body).toMatchObject({ valid: false, brokenAt: invoice.fullNumber })
      } finally {
        await db.update(invoices).set({ issueDate: invoice.issueDate }).where(eq(invoices.id, invoice.id))
        await db.execute(sql`ALTER TABLE invoices ENABLE TRIGGER invoices_guard_issued`)
      }
      expect((await panel.get('/invoices/chain/verify')).body.valid).toBe(true)
    })
  })

  describe('cobros', () => {
    it('registra y deshace el cobro, con auditoría', async () => {
      const invoice = await issuedInvoice()
      const paid = await panel.post(`/invoices/${invoice.id}/payment`, { paidOn: today })
      expect(paid.body.paidOn).toBe(today)
      const undone = await panel.post(`/invoices/${invoice.id}/payment`, { paidOn: null })
      expect(undone.body.paidOn).toBeNull()

      const rows = await getDb()
        .select({ action: auditLog.action })
        .from(auditLog)
        .where(sql`${auditLog.metadata}->>'invoiceId' = ${invoice.id}`)
      expect(rows.map((r) => r.action)).toEqual(
        expect.arrayContaining(['invoice.issue', 'invoice.payment.record', 'invoice.payment.undo']),
      )
    })

    it('no se cobra un borrador ni antes de la fecha de la factura', async () => {
      const created = (await panel.post('/invoices', draft())).body
      expect((await panel.post(`/invoices/${created.id}/payment`, { paidOn: today })).status).toBe(409)
      const invoice = await issuedInvoice()
      expect((await panel.post(`/invoices/${invoice.id}/payment`, { paidOn: '2000-01-01' })).status).toBe(400)
    })
  })

  describe('rectificativas', () => {
    it('crea un borrador R con las líneas en negativo y se emite en su serie', async () => {
      const original = await issuedInvoice()
      const draftRes = await panel.post(`/invoices/${original.id}/rectify`, { reason: 'Error en el precio' })
      expect(draftRes.status).toBe(201)
      expect(draftRes.body).toMatchObject({
        kind: 'rectifying',
        status: 'draft',
        rectifies: { id: original.id, fullNumber: original.fullNumber },
        totalCents: -original.totalCents,
      })

      const issued = await panel.post(`/invoices/${draftRes.body.id}/issue`)
      expect(issued.status).toBe(200)
      expect(issued.body.fullNumber).toMatch(/^R-\d{4}-\d{4}$/)
      expect((await panel.get(`/invoices/${original.id}`)).body.rectifiedBy[0].id).toBe(draftRes.body.id)
    })

    it('no se puede rectificar un borrador', async () => {
      const created = (await panel.post('/invoices', draft())).body
      expect((await panel.post(`/invoices/${created.id}/rectify`, { reason: 'x motivo' })).status).toBe(409)
    })
  })

  describe('listado', () => {
    it('filtra por estado y los totales solo cuentan las emitidas', async () => {
      const tag = randomUUID().slice(0, 8)
      await panel.post('/invoices', draft({ notes: tag }))
      const issued = await issuedInvoice({ notes: tag })

      const all = await panel.get(`/invoices?q=${tag}`)
      expect(all.body.total).toBe(2)
      expect(all.body.items[0].status).toBe('draft') // borradores primero
      expect(all.body.sums).toMatchObject({ totalCents: issued.totalCents, outstandingCents: issued.totalCents })

      const drafts = await panel.get(`/invoices?q=${tag}&status=draft`)
      expect(drafts.body.total).toBe(1)
    })

    it('encuentra una factura por su número', async () => {
      const issued = await issuedInvoice()
      const res = await panel.get(`/invoices?q=${issued.fullNumber}`)
      expect(res.body.items.map((i: { id: string }) => i.id)).toContain(issued.id)
    })
  })
})
