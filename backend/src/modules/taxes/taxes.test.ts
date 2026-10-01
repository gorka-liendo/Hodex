import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import { eq } from 'drizzle-orm'
import { unzipSync, strFromU8 } from 'fflate'
import { createApp } from '../../app.js'
import { closeDb, getDb } from '../../db/client.js'
import { sessions } from '../../db/schema/index.js'
import { currentQuarter, todayInSpain } from '../../lib/periods.js'
import { hasTestDatabase, migrateTestDatabase } from '../../test/db.js'
import { signedInPanel } from '../../test/session.js'

const app = createApp()

/** Supertest: cuerpo binario. */
const binary = (res: request.Response, callback: (err: Error | null, body: Buffer) => void) => {
  const chunks: Buffer[] = []
  res.on('data', (chunk: Buffer) => chunks.push(chunk))
  res.on('end', () => callback(null, Buffer.concat(chunks)))
}

describe.skipIf(!hasTestDatabase)('impuestos trimestrales', () => {
  let panel: Awaited<ReturnType<typeof signedInPanel>>
  let clientId: string
  const { year, quarter } = currentQuarter()
  const period = `year=${year}&quarter=${quarter}`

  beforeAll(async () => {
    await migrateTestDatabase(getDb())
    panel = await signedInPanel(app)
    await panel
      .put('/settings/company', {
        legalName: 'Hodex Studio SL',
        tradeName: 'Hodex',
        taxId: 'B12345674',
        addressLine: 'Calle Mayor 1',
        postalCode: '39700',
        city: 'Castro Urdiales',
        country: 'ES',
      })
      .expect(200)
    clientId = (
      await panel.post('/contacts', {
        isClient: true,
        isSupplier: false,
        legalName: `Cliente Impuestos ${randomUUID().slice(0, 6)} SL`,
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

  async function issue(lines: object[], irpfRateBp = 0) {
    const draft = (await panel.post('/invoices', { clientId, issueDate: todayInSpain(), irpfRateBp, lines })).body
    return (await panel.post(`/invoices/${draft.id}/issue`).expect(200)).body
  }

  it('el resumen refleja facturas emitidas y gastos del trimestre', async () => {
    const before = (await panel.get(`/taxes?${period}`).expect(200)).body

    await issue([{ description: 'Web', quantityMilli: 1_000, unitPriceCents: 100_000, vatRateBp: 2100 }], 1500)
    await issue([{ description: 'Consultoría UE', quantityMilli: 1_000, unitPriceCents: 40_000, vatRateBp: 0 }])
    await panel
      .post('/expenses', { issueDate: todayInSpain(), description: 'Hosting', category: 'software', totalCents: 12_100, vatRateBp: 2100 })
      .expect(201)

    const after = (await panel.get(`/taxes?${period}`).expect(200)).body
    expect(after.period).toMatchObject({ year, quarter })
    expect(after.model303.totalAccruedVatCents - before.model303.totalAccruedVatCents).toBe(21_000)
    expect(after.model303.totalDeductibleCents - before.model303.totalDeductibleCents).toBe(2_100)
    const box59 = (m: { informative: Array<{ box: string; cents: number }> }) => m.informative.find((b) => b.box === '59')?.cents ?? 0
    expect(box59(after.model303) - box59(before.model303)).toBe(40_000)
    expect(after.model130.incomeCents - before.model130.incomeCents).toBe(140_000)
    expect(after.model130.expensesCents - before.model130.expensesCents).toBe(10_000)
    expect(after.model130.withholdingsCents - before.model130.withholdingsCents).toBe(15_000)
  })

  it('sin parámetros devuelve el último trimestre terminado', async () => {
    const res = await panel.get('/taxes').expect(200)
    expect(res.body.deadline.from).toMatch(/^\d{4}-\d{2}-01$/)
  })

  it('las descargas exigen 2FA reciente', async () => {
    await getDb()
      .update(sessions)
      .set({ reauthenticatedAt: new Date(Date.now() - 11 * 60_000) })
      .where(eq(sessions.id, panel.sessionId))
    const res = await panel.get(`/taxes/package?${period}`)
    expect(res.status).toBe(403)
    expect(res.body.error).toBe('ReauthRequired')
    await getDb().update(sessions).set({ reauthenticatedAt: new Date() }).where(eq(sessions.id, panel.sessionId))
  })

  it('el libro de ingresos es un CSV para Excel en español', async () => {
    const res = await panel.get(`/taxes/books/ingresos?${period}`).buffer(true).parse(binary)
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toContain('text/csv')
    const text = (res.body as Buffer).toString('utf8')
    expect(text.startsWith('﻿Fecha;Número;')).toBe(true)
    expect(text).toContain(';1000,00;21;210,00;15;150,00;')
  })

  it('el paquete ZIP trae resumen, libros, PDF de facturas y justificantes', async () => {
    const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(16)])
    const file = (await panel.upload('/attachments', PNG, 'ticket=malo.png')).body
    await panel
      .post('/expenses', {
        issueDate: todayInSpain(),
        description: '=HYPERLINK("http://x")',
        category: 'other',
        totalCents: 500,
        vatRateBp: 0,
        attachmentIds: [file.id],
      })
      .expect(201)

    const res = await panel.get(`/taxes/package?${period}`).buffer(true).parse(binary)
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toBe('application/zip')
    const zip = unzipSync(new Uint8Array(res.body as Buffer))
    const names = Object.keys(zip)
    expect(names).toEqual(expect.arrayContaining(['resumen-impuestos.txt', 'libro-ingresos.csv', 'libro-gastos.csv']))
    expect(names.some((n) => n.startsWith('facturas-emitidas/') && n.endsWith('.pdf'))).toBe(true)
    expect(names.some((n) => n.startsWith('gastos/') && n.endsWith('ticket=malo.png'))).toBe(true)
    expect(strFromU8(zip['resumen-impuestos.txt']!)).toContain('MODELO 303')
    // Un concepto con fórmula no se ejecuta en Excel.
    expect(strFromU8(zip['libro-gastos.csv']!)).toContain(`"'=HYPERLINK(""http://x"")"`)
    // La BD de test acumula facturas de muchas ejecuciones: un PDF por cada una.
  }, 120_000)
})

describe.skipIf(!hasTestDatabase)('registro de actividad', () => {
  let panel: Awaited<ReturnType<typeof signedInPanel>>

  beforeAll(async () => {
    await migrateTestDatabase(getDb())
    panel = await signedInPanel(app)
  })

  it('lista la actividad filtrando por grupo y sin eventos de tests', async () => {
    await panel.post('/contacts', { isClient: true, isSupplier: false, legalName: `Actividad ${randomUUID().slice(0, 6)}`, country: 'ES' })
    const all = (await panel.get('/audit?pageSize=100').expect(200)).body
    expect(all.items.length).toBeGreaterThan(0)
    expect(all.items.some((i: { action: string }) => i.action.startsWith('test.'))).toBe(false)
    expect(all.aiUsage).toMatchObject({ readings: expect.any(Number), inputTokens: expect.any(Number) })
    expect(typeof all.failedLogins24h).toBe('number')

    const contacts = (await panel.get('/audit?group=contacts').expect(200)).body
    expect(contacts.items.length).toBeGreaterThan(0)
    expect(contacts.items.every((i: { action: string }) => i.action.startsWith('contact.'))).toBe(true)
  })

  it('filtra por fechas y rechaza parámetros raros', async () => {
    const future = (await panel.get('/audit?from=2099-01-01').expect(200)).body
    expect(future.items).toEqual([])
    await panel.get('/audit?group=nada').expect(400)
  })
})
