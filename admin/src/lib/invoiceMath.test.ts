import { describe, expect, it } from 'vitest'
import { computeInvoiceTotals } from './invoiceMath'
import { milliToInput, parseQuantityToMilli } from './money'

describe('cantidades', () => {
  it.each([
    ['1', 1_000],
    ['1,5', 1_500],
    ['2.25', 2_250],
    ['0,125', 125],
    ['-3', -3_000],
  ])('"%s" → %i milésimas', (input, expected) => expect(parseQuantityToMilli(input)).toBe(expected))

  it.each(['', 'a', '1,2345', '1.000,5'])('rechaza "%s"', (input) => expect(parseQuantityToMilli(input)).toBeNull())

  it('ida y vuelta', () => {
    for (const milli of [1_000, 1_500, 125, -3_000]) expect(parseQuantityToMilli(milliToInput(milli))).toBe(milli)
  })
})

describe('computeInvoiceTotals (mismos casos que el servidor)', () => {
  it('servicios con retención', () => {
    expect(computeInvoiceTotals([{ quantityMilli: 10_000, unitPriceCents: 6_000, vatRateBp: 2100 }], 1500)).toMatchObject({
      baseCents: 60_000,
      vatCents: 12_600,
      irpfCents: 9_000,
      totalCents: 63_600,
    })
  })

  it('agrupa el IVA por tipo antes de redondear', () => {
    const lines = Array.from({ length: 3 }, () => ({ quantityMilli: 1_000, unitPriceCents: 5, vatRateBp: 1000 }))
    expect(computeInvoiceTotals(lines, 0).vatCents).toBe(2)
  })
})
