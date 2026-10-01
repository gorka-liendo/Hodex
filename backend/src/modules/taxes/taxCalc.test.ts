import { describe, expect, it } from 'vitest'
import {
  compute130,
  compute303,
  filingDeadline,
  quarterToFile,
  taxWarnings,
  type ExpenseForTax,
  type InvoiceForTax,
} from './taxCalc.js'

let seq = 0
const invoice = (o: Partial<InvoiceForTax> & { base: number; rate?: number; irpf?: number }): InvoiceForTax => {
  const rate = o.rate ?? 2100
  return {
    id: `i${++seq}`,
    fullNumber: `F-${seq}`,
    issueDate: o.issueDate ?? '2026-08-01',
    clientCountry: o.clientCountry ?? 'ES',
    baseCents: o.base,
    irpfCents: o.irpf ?? 0,
    vatGroups: o.vatGroups ?? [{ rateBp: rate, baseCents: o.base, vatCents: Math.round((o.base * rate) / 10_000) }],
  }
}

const expense = (o: Partial<ExpenseForTax> & { base: number; vat?: number }): ExpenseForTax => ({
  id: `e${++seq}`,
  issueDate: o.issueDate ?? '2026-08-01',
  description: 'Gasto',
  category: o.category ?? 'software',
  baseCents: o.base,
  vatRateBp: o.vatRateBp ?? 2100,
  vatCents: o.vat ?? Math.round(o.base * 0.21),
  vatDeductible: o.vatDeductible ?? true,
  supplierCountry: o.supplierCountry ?? 'ES',
  hasSupplier: o.hasSupplier ?? true,
  attachmentCount: o.attachmentCount ?? 1,
})

describe('periodos', () => {
  it('el trimestre a declarar es el último terminado', () => {
    expect(quarterToFile('2026-10-01')).toEqual({ year: 2026, quarter: 3 })
    expect(quarterToFile('2026-12-31')).toEqual({ year: 2026, quarter: 3 })
    expect(quarterToFile('2027-01-15')).toEqual({ year: 2026, quarter: 4 })
    expect(quarterToFile('2026-04-02')).toEqual({ year: 2026, quarter: 1 })
  })

  it('plazos: del 1 al 20 del mes siguiente; el 4T hasta el 30 de enero', () => {
    expect(filingDeadline({ year: 2026, quarter: 3 })).toEqual({ from: '2026-10-01', to: '2026-10-20' })
    expect(filingDeadline({ year: 2026, quarter: 4 })).toEqual({ from: '2027-01-01', to: '2027-01-30' })
  })
})

describe('modelo 303', () => {
  it('agrupa el IVA devengado por tipo y resta el soportado deducible', () => {
    const m = compute303(
      [invoice({ base: 100_000 }), invoice({ base: 50_000 }), invoice({ base: 10_000, rate: 1000 })],
      [expense({ base: 20_000 }), expense({ base: 5_000, vatDeductible: false })],
    )
    expect(m.accrued).toEqual([
      { rateBp: 1000, baseBox: '04', vatBox: '06', baseCents: 10_000, vatCents: 1_000 },
      { rateBp: 2100, baseBox: '07', vatBox: '09', baseCents: 150_000, vatCents: 31_500 },
    ])
    expect(m.totalAccruedVatCents).toBe(32_500)
    expect(m.deductible).toEqual([
      { box: '28', label: expect.any(String), cents: 20_000 },
      { box: '29', label: expect.any(String), cents: 4_200 },
    ])
    expect(m.resultCents).toBe(32_500 - 4_200)
  })

  it('clientes extranjeros sin IVA: UE en la 59, fuera de la UE en la 120', () => {
    const m = compute303(
      [invoice({ base: 70_000, rate: 0, clientCountry: 'FR' }), invoice({ base: 30_000, rate: 0, clientCountry: 'US' })],
      [],
    )
    expect(m.informative.map((b) => [b.box, b.cents])).toEqual([
      ['59', 70_000],
      ['120', 30_000],
    ])
    expect(m.resultCents).toBe(0)
  })

  it('equipos de más de 3.005,06 € van como bienes de inversión', () => {
    const m = compute303([], [expense({ base: 400_000, category: 'hardware' }), expense({ base: 100_000, category: 'hardware' })])
    expect(m.deductible.map((b) => [b.box, b.cents])).toEqual([
      ['28', 100_000],
      ['29', 21_000],
      ['30', 400_000],
      ['31', 84_000],
    ])
  })

  it('una rectificativa resta', () => {
    const m = compute303([invoice({ base: 100_000 }), invoice({ base: -20_000 })], [])
    expect(m.totalAccruedVatCents).toBe(16_800)
  })
})

describe('modelo 130', () => {
  it('20 % del rendimiento acumulado menos retenciones', () => {
    const m = compute130(
      { year: 2026, quarter: 1 },
      [invoice({ base: 300_000, issueDate: '2026-02-01', irpf: 21_000 })],
      [expense({ base: 50_000, issueDate: '2026-02-10' })],
    )
    expect(m).toEqual({
      incomeCents: 300_000,
      expensesCents: 50_000,
      netCents: 250_000,
      twentyPercentCents: 50_000,
      previousPaymentsCents: 0,
      withholdingsCents: 21_000,
      resultCents: 29_000,
      toPayCents: 29_000,
    })
  })

  it('el IVA no deducible cuenta como gasto en IRPF', () => {
    const m = compute130({ year: 2026, quarter: 1 }, [], [expense({ base: 10_000, vat: 2_100, vatDeductible: false, issueDate: '2026-01-05' })])
    expect(m.expensesCents).toBe(12_100)
  })

  it('resta lo pagado en trimestres anteriores y compensa un trimestre negativo', () => {
    const invoices = [
      invoice({ base: 100_000, issueDate: '2026-02-01' }), // 1T: +1.000 € de rendimiento
      invoice({ base: 50_000, issueDate: '2026-05-01' }),
    ]
    const expenses = [expense({ base: 120_000, issueDate: '2026-04-15' })] // 2T en negativo
    const q1 = compute130({ year: 2026, quarter: 1 }, invoices, expenses)
    const q2 = compute130({ year: 2026, quarter: 2 }, invoices, expenses)
    const q3 = compute130({ year: 2026, quarter: 3 }, [...invoices, invoice({ base: 200_000, issueDate: '2026-08-01' })], expenses)

    expect(q1.toPayCents).toBe(20_000)
    // 2T: acumulado 1.500 − 1.200 = 300 € → 20 % = 60 €, menos 200 € ya pagados → negativo, 0 a ingresar.
    expect(q2).toMatchObject({ netCents: 30_000, twentyPercentCents: 6_000, previousPaymentsCents: 20_000, resultCents: -14_000, toPayCents: 0 })
    // 3T: acumulado 3.500 − 1.200 = 2.300 € → 460 €, menos 200 € pagados = 260 €.
    expect(q3).toMatchObject({ netCents: 230_000, twentyPercentCents: 46_000, previousPaymentsCents: 20_000, toPayCents: 26_000 })
  })

  it('con pérdidas no hay 20 %', () => {
    const m = compute130({ year: 2026, quarter: 1 }, [], [expense({ base: 10_000, issueDate: '2026-01-05' })])
    expect(m.twentyPercentCents).toBe(0)
    expect(m.toPayCents).toBe(0)
  })
})

describe('avisos', () => {
  it('detecta borradores, posible inversión del sujeto pasivo, gastos sin proveedor o sin ticket y equipos a amortizar', () => {
    const w = taxWarnings(
      [
        expense({ base: 1_000, vat: 0, supplierCountry: 'US' }),
        expense({ base: 1_000, hasSupplier: false, supplierCountry: null, attachmentCount: 0 }),
        expense({ base: 50_000, category: 'hardware' }),
      ],
      2,
    )
    expect(Object.fromEntries(w.map((x) => [x.code, x.count]))).toEqual({
      drafts: 2,
      reverse_charge: 1,
      no_supplier: 1,
      no_receipt: 1,
      amortization: 1,
    })
  })
})
