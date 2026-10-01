import { describe, expect, it } from 'vitest'
import { applyRate, breakdownFromTotal, centsToInput, formatCents, formatRate, parseAmountToCents } from './money'

describe('parseAmountToCents', () => {
  it.each([
    ['1.234,56', 123_456],
    ['1234,56', 123_456],
    ['1234.56', 123_456],
    ['1 234,5', 123_450],
    ['1.234.567', 123_456_700],
    ['12,3', 1_230],
    ['0,05', 5],
    ['20', 2_000],
    ['20 €', 2_000],
    ['-15,50', -1_550],
    ['1,234.56', 123_456], // formato inglés también se entiende
  ])('"%s" → %i céntimos', (input, expected) => {
    expect(parseAmountToCents(input)).toBe(expected)
  })

  it.each(['', 'abc', '12,345,6', '1.2.3', '12.3.45', '--5', '1e5'])('rechaza "%s"', (input) => {
    expect(parseAmountToCents(input)).toBeNull()
  })
})

describe('formato', () => {
  it('céntimos a euros en formato español', () => {
    expect(formatCents(123_456).replace(/\s/g, ' ')).toBe('1234,56 €')
    expect(formatCents(-500).replace(/\s/g, ' ')).toBe('-5,00 €')
    expect(formatCents(-0).replace(/\s/g, ' ')).toBe('0,00 €')
  })

  it('tipos en porcentaje', () => {
    expect(formatRate(2100)).toBe('21 %')
    expect(formatRate(550)).toBe('5,5 %')
  })

  it('centsToInput es el inverso de parseAmountToCents', () => {
    for (const cents of [0, 5, 123_456, -1_550]) {
      expect(parseAmountToCents(centsToInput(cents))).toBe(cents)
    }
  })

  it('applyRate coincide con el servidor', () => {
    expect(applyRate(1_999, 2100)).toBe(420)
    expect(applyRate(-5, 1000)).toBe(-1)
  })
})

describe('breakdownFromTotal (mismo resultado que el servidor)', () => {
  it('13 € con 21 % incluido', () => {
    expect(breakdownFromTotal(1_300, 2100, 0)).toEqual({ baseCents: 1_074, vatCents: 226, irpfCents: 0, totalCents: 1_300 })
  })
  it('siempre cuadra al céntimo', () => {
    for (let total = 1; total <= 50_000; total++) {
      const b = breakdownFromTotal(total, 2100, 1500)
      expect(b.baseCents + b.vatCents - b.irpfCents).toBe(total)
    }
  })
})
