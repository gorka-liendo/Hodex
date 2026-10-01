import { describe, expect, it } from 'vitest'
import { computeInvoiceTotals } from './invoiceMath.js'
import { multiplyQuantity } from './money.js'

describe('multiplyQuantity', () => {
  it.each([
    [5_000, 1_000, 5_000], // 1 × 50,00
    [6_000, 1_500, 9_000], // 1,5 h × 60,00
    [333, 3_000, 999], // 3 × 3,33
    [1_999, 2_500, 4_998], // 2,5 × 19,99 = 49,975 → 49,98
    [-5_000, 1_000, -5_000], // línea de descuento
  ])('%i × %i milésimas = %i', (unit, qty, expected) => {
    expect(multiplyQuantity(unit, qty)).toBe(expected)
  })
})

describe('computeInvoiceTotals', () => {
  it('factura sencilla de servicios con retención de profesional', () => {
    const totals = computeInvoiceTotals(
      [{ quantityMilli: 10_000, unitPriceCents: 6_000, vatRateBp: 2100 }], // 10 h × 60 €
      1500,
    )
    expect(totals).toMatchObject({
      baseCents: 60_000,
      vatCents: 12_600,
      irpfCents: 9_000,
      totalCents: 63_600,
      vatBreakdown: [{ rateBp: 2100, baseCents: 60_000, vatCents: 12_600 }],
    })
  })

  it('agrupa el IVA por tipo antes de redondear', () => {
    // Tres líneas de 0,05 € al 10 %: línea a línea serían 3 × 0,01 = 0,03 €;
    // agrupando: 0,15 × 10 % = 0,015 → 0,02 €. La norma es agrupar.
    const lines = Array.from({ length: 3 }, () => ({ quantityMilli: 1_000, unitPriceCents: 5, vatRateBp: 1000 }))
    expect(computeInvoiceTotals(lines, 0).vatCents).toBe(2)
  })

  it('desglosa varios tipos de IVA, del mayor al menor', () => {
    const totals = computeInvoiceTotals(
      [
        { quantityMilli: 1_000, unitPriceCents: 10_000, vatRateBp: 1000 },
        { quantityMilli: 2_000, unitPriceCents: 5_000, vatRateBp: 2100 },
        { quantityMilli: 1_000, unitPriceCents: 3_000, vatRateBp: 2100 },
      ],
      0,
    )
    expect(totals.vatBreakdown).toEqual([
      { rateBp: 2100, baseCents: 13_000, vatCents: 2_730 },
      { rateBp: 1000, baseCents: 10_000, vatCents: 1_000 },
    ])
    expect(totals.totalCents).toBe(23_000 + 3_730)
    expect(totals.lineBases).toEqual([10_000, 10_000, 3_000])
  })

  it('una línea de descuento reduce la base de su tipo', () => {
    const totals = computeInvoiceTotals(
      [
        { quantityMilli: 1_000, unitPriceCents: 100_000, vatRateBp: 2100 },
        { quantityMilli: 1_000, unitPriceCents: -10_000, vatRateBp: 2100 },
      ],
      0,
    )
    expect(totals).toMatchObject({ baseCents: 90_000, vatCents: 18_900, totalCents: 108_900 })
  })
})
