import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { createApp } from '../../app.js'
import { closeDb, getDb } from '../../db/client.js'
import { expenses, sessions } from '../../db/schema/index.js'
import { hasTestDatabase, migrateTestDatabase } from '../../test/db.js'
import { signedInPanel } from '../../test/session.js'

const app = createApp()
type Panel = Awaited<ReturnType<typeof signedInPanel>>

describe.skipIf(!hasTestDatabase)('gastos', () => {
  let panel: Panel
  let supplierId: string
  let clientOnlyId: string
  /** Etiqueta única de esta ejecución para filtrar solo nuestros gastos. */
  const tag = randomUUID().slice(0, 8)

  const baseExpense = (override: object = {}) => ({
    supplierId,
    issueDate: '2026-07-15',
    invoiceNumber: 'F-2026-001',
    description: `Licencias ${tag}`,
    category: 'software',
    baseCents: 10_000,
    vatRateBp: 2100,
    irpfRateBp: 0,
    vatDeductible: true,
    paidOn: null,
    notes: '',
    ...override,
  })

  beforeAll(async () => {
    await migrateTestDatabase(getDb())
    panel = await signedInPanel(app)
    supplierId = (
      await panel.post('/contacts', {
        isClient: false,
        isSupplier: true,
        legalName: `Proveedor ${tag} SL`,
        country: 'ES',
      })
    ).body.id
    clientOnlyId = (
      await panel.post('/contacts', { isClient: true, isSupplier: false, legalName: `Cliente ${tag}`, country: 'ES' })
    ).body.id
  })

  afterAll(async () => {
    await closeDb()
  })

  it('calcula IVA, IRPF y total en el servidor', async () => {
    const res = await panel.post('/expenses', baseExpense({ baseCents: 100_000, irpfRateBp: 1500 }))
    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({
      baseCents: 100_000,
      vatCents: 21_000,
      irpfCents: 15_000,
      totalCents: 106_000,
      supplier: { id: supplierId, legalName: `Proveedor ${tag} SL` },
    })
    expect(res.body).not.toHaveProperty('deletedAt')
  })

  it('ignora importes enviados por el cliente: rechaza campos derivados', async () => {
    const res = await panel.post('/expenses', { ...baseExpense(), totalCents: 1 })
    expect(res.status).toBe(400)
  })

  it.each([
    ['fecha imposible', { issueDate: '2026-02-30' }, 'issueDate'],
    ['importe con decimales (debe ir en céntimos)', { baseCents: 10.5 }, 'baseCents'],
    ['importe cero', { baseCents: 0 }, 'baseCents'],
    ['tipo de IVA fuera de rango', { vatRateBp: 20_000 }, 'vatRateBp'],
    ['categoría desconocida', { category: 'yates' }, 'category'],
    ['sin concepto', { description: ' ' }, 'description'],
  ])('rechaza %s', async (_label, override, field) => {
    const res = await panel.post('/expenses', baseExpense(override))
    expect(res.status).toBe(400)
    expect(res.body.issues.map((i: { path: string[] }) => i.path[0])).toContain(field)
  })

  it('solo admite como proveedor un contacto marcado como proveedor', async () => {
    const res = await panel.post('/expenses', baseExpense({ supplierId: clientOnlyId }))
    expect(res.status).toBe(400)
    expect(res.body.details[0].path).toEqual(['supplierId'])
    expect((await panel.post('/expenses', baseExpense({ supplierId: randomUUID() }))).status).toBe(400)
  })

  it('permite gastos sin proveedor (p. ej. un ticket)', async () => {
    const res = await panel.post('/expenses', baseExpense({ supplierId: null, category: 'meals' }))
    expect(res.status).toBe(201)
    expect(res.body.supplier).toBeNull()
  })

  it('la BD rechaza un desglose que no cuadra aunque la app fallara', async () => {
    await expect(
      getDb().insert(expenses).values({
        issueDate: '2026-01-01',
        description: 'descuadre',
        category: 'other',
        baseCents: 100,
        vatRateBp: 2100,
        vatCents: 21,
        totalCents: 999,
      }),
    ).rejects.toThrow()
  })

  it('lista con filtros y totales (IVA deducible aparte)', async () => {
    const q = `Filtro ${randomUUID().slice(0, 8)}`
    await panel.post('/expenses', baseExpense({ description: `${q} a`, issueDate: '2026-04-10', paidOn: '2026-04-11' }))
    await panel.post('/expenses', baseExpense({ description: `${q} b`, issueDate: '2026-05-10', vatDeductible: false }))
    await panel.post('/expenses', baseExpense({ description: `${q} c`, issueDate: '2025-12-31' }))

    const q2 = await panel.get(`/expenses?q=${encodeURIComponent(q)}&from=2026-04-01&to=2026-06-30`)
    expect(q2.body.total).toBe(2)
    expect(q2.body.sums).toEqual({
      baseCents: 20_000,
      vatCents: 4_200,
      deductibleVatCents: 2_100,
      totalCents: 24_200,
    })
    // Ordenados por fecha, más reciente primero.
    expect(q2.body.items.map((e: { issueDate: string }) => e.issueDate)).toEqual(['2026-05-10', '2026-04-10'])

    const unpaid = await panel.get(`/expenses?q=${encodeURIComponent(q)}&status=unpaid`)
    expect(unpaid.body.total).toBe(2)
  })

  it('busca también por nombre del proveedor', async () => {
    const res = await panel.get(`/expenses?q=${encodeURIComponent(`Proveedor ${tag}`)}`)
    expect(res.body.total).toBeGreaterThan(0)
  })

  it('edita recalculando importes', async () => {
    const created = (await panel.post('/expenses', baseExpense())).body
    const res = await panel.put(`/expenses/${created.id}`, baseExpense({ baseCents: 5_000, vatRateBp: 1000 }))
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ baseCents: 5_000, vatCents: 500, totalCents: 5_500 })
  })

  describe('eliminar (acción sensible)', () => {
    it('exige haber confirmado el 2FA recientemente', async () => {
      const created = (await panel.post('/expenses', baseExpense())).body
      await getDb()
        .update(sessions)
        .set({ reauthenticatedAt: new Date(Date.now() - 60 * 60_000) })
        .where(eq(sessions.id, panel.sessionId))

      const res = await panel.delete(`/expenses/${created.id}`)
      expect(res.status).toBe(403)
      expect(res.body.error).toBe('ReauthRequired')
      expect((await panel.get(`/expenses/${created.id}`)).status).toBe(200)
    })

    it('con 2FA reciente, lo retira de listados y totales (baja lógica)', async () => {
      await getDb().update(sessions).set({ reauthenticatedAt: new Date() }).where(eq(sessions.id, panel.sessionId))
      const created = (await panel.post('/expenses', baseExpense({ description: `Borrable ${tag}` }))).body

      expect((await panel.delete(`/expenses/${created.id}`)).status).toBe(204)
      expect((await panel.get(`/expenses/${created.id}`)).status).toBe(404)
      expect((await panel.get(`/expenses?q=Borrable ${tag}`)).body.total).toBe(0)

      const [row] = await getDb().select().from(expenses).where(eq(expenses.id, created.id))
      expect(row?.deletedAt).not.toBeNull() // sigue en la BD
    })
  })
})
