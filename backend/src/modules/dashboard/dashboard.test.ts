import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createApp } from '../../app.js'
import { closeDb, getDb } from '../../db/client.js'
import { currentMonth, currentQuarter, todayInSpain } from '../../lib/periods.js'
import { hasTestDatabase, migrateTestDatabase } from '../../test/db.js'
import { signedInPanel } from '../../test/session.js'
import { getDashboard } from './dashboard.service.js'

const app = createApp()

describe('periodos en hora de Madrid', () => {
  it('a las 00:30 del 1 de octubre en Madrid ya es 4T aunque en UTC siga siendo septiembre', () => {
    const now = new Date('2026-09-30T22:30:00Z')
    expect(todayInSpain(now)).toBe('2026-10-01')
    expect(currentMonth(now)).toEqual({ from: '2026-10-01', to: '2026-10-31' })
    expect(currentQuarter(now)).toMatchObject({ quarter: 4, from: '2026-10-01', to: '2026-12-31' })
  })
})

describe.skipIf(!hasTestDatabase)('resumen', () => {
  let panel: Awaited<ReturnType<typeof signedInPanel>>

  beforeAll(async () => {
    await migrateTestDatabase(getDb())
    panel = await signedInPanel(app)
  })

  afterAll(async () => {
    await closeDb()
  })

  it('suma los gastos del mes, el IVA deducible del trimestre y lo pendiente de pago', async () => {
    const before = await getDashboard()
    const today = todayInSpain()
    const expense = (override: object) => ({
      issueDate: today,
      description: 'Resumen',
      category: 'software',
      baseCents: 10_000,
      vatRateBp: 2100,
      ...override,
    })
    await panel.post('/expenses', expense({ paidOn: today })).expect(201)
    await panel.post('/expenses', expense({ vatDeductible: false })).expect(201)

    const res = await panel.get('/dashboard')
    expect(res.status).toBe(200)
    expect(res.body.month.expensesBaseCents - before.month.expensesBaseCents).toBe(20_000)
    expect(res.body.quarter.deductibleVatCents - before.quarter.deductibleVatCents).toBe(2_100)
    expect(res.body.unpaidExpenses.totalCents - before.unpaidExpenses.totalCents).toBe(12_100)
    expect(res.body.unpaidExpenses.count - before.unpaidExpenses.count).toBe(1)
  })

  it('suma lo facturado, el IVA repercutido y lo pendiente de cobro; el 303 es repercutido − soportado', async () => {
    await panel.put('/settings/company', {
      legalName: 'Hodex Studio SL',
      taxId: 'B12345674',
      addressLine: 'Calle Mayor 1',
      postalCode: '48001',
      city: 'Bilbao',
      country: 'ES',
    })
    const client = (
      await panel.post('/contacts', {
        isClient: true,
        isSupplier: false,
        legalName: 'Cliente Resumen SL',
        country: 'FR',
        taxId: `FR${Date.now()}`,
        addressLine: '1 Rue',
        city: 'Paris',
      })
    ).body.id
    const before = await getDashboard()
    const lines = [{ description: 'Servicio', quantityMilli: 1_000, unitPriceCents: 100_000, vatRateBp: 2100 }]
    const draft = (await panel.post('/invoices', { clientId: client, issueDate: todayInSpain(), lines })).body
    await panel.post(`/invoices/${draft.id}/issue`).expect(200)
    // Un borrador no cuenta.
    await panel.post('/invoices', { clientId: client, issueDate: todayInSpain(), lines }).expect(201)

    const after = (await panel.get('/dashboard')).body
    expect(after.month.invoicedBaseCents - before.month.invoicedBaseCents).toBe(100_000)
    expect(after.quarter.outputVatCents - before.quarter.outputVatCents).toBe(21_000)
    expect(after.receivables.outstandingCents - before.receivables.outstandingCents).toBe(121_000)
    expect(after.quarter.vatBalanceCents).toBe(after.quarter.outputVatCents - after.quarter.deductibleVatCents)
  })
})
