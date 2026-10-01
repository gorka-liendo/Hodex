import { describe, expect, it } from 'vitest'
import { applyRate, breakdownFromTotal, computeBreakdown } from './money.js'

describe('applyRate', () => {
  it.each([
    [10_000, 2100, 2_100], // 100,00 € al 21 % = 21,00 €
    [1_999, 2100, 420], // 19,99 × 21 % = 4,1979 → 4,20
    [50, 1000, 5], // 0,50 × 10 % = 0,05
    [25, 2000, 5], // 0,25 × 20 % = 0,05 exacto
    [5, 1000, 1], // 0,05 × 10 % = 0,005 → mitad hacia fuera → 0,01
    [-5, 1000, -1], // abono: −0,005 → −0,01 (simétrico)
    [12_345, 0, 0],
  ])('%i céntimos al %i pb = %i', (cents, rate, expected) => {
    expect(applyRate(cents, rate)).toBe(expected)
  })
})

describe('computeBreakdown', () => {
  it('factura de profesional con IVA 21 % y retención 15 %', () => {
    expect(computeBreakdown(100_000, 2100, 1500)).toEqual({
      baseCents: 100_000,
      vatCents: 21_000,
      irpfCents: 15_000,
      totalCents: 106_000,
    })
  })

  it('no acumula errores de coma flotante', () => {
    // 0,10 + 0,20 en floats da 0,30000000000000004; aquí todo es entero.
    const { totalCents } = computeBreakdown(30, 2100, 0)
    expect(totalCents).toBe(36)
    expect(Number.isInteger(totalCents)).toBe(true)
  })
})

describe('breakdownFromTotal (lo pagado, IVA incluido)', () => {
  it('13 € con IVA del 21 % incluido', () => {
    expect(breakdownFromTotal(1_300, 2100, 0)).toEqual({ baseCents: 1_074, vatCents: 226, irpfCents: 0, totalCents: 1_300 })
  })

  it('sin IVA: todo es base', () => {
    expect(breakdownFromTotal(1_300, 0, 0)).toEqual({ baseCents: 1_300, vatCents: 0, irpfCents: 0, totalCents: 1_300 })
  })

  it('con retención: total = base + IVA − IRPF', () => {
    // Factura de 100 € de base con 21 % IVA y 15 % IRPF → se pagan 106 €.
    expect(breakdownFromTotal(10_600, 2100, 1500)).toEqual(computeBreakdown(10_000, 2100, 1500))
  })

  it.each([
    [2100, 0],
    [1000, 0],
    [400, 0],
    [2100, 1500],
    [2100, 700],
  ])('cuadra al céntimo en TODOS los importes hasta 2.000 € (IVA %i pb, IRPF %i pb)', (vat, irpf) => {
    for (let total = 1; total <= 200_000; total++) {
      const b = breakdownFromTotal(total, vat, irpf)
      expect(b.baseCents + b.vatCents - b.irpfCents).toBe(total)
      // El IVA nunca se aparta más de 1 céntimo del que corresponde a la base.
      expect(Math.abs(b.vatCents - applyRate(b.baseCents, vat))).toBeLessThanOrEqual(1)
    }
  })
})
