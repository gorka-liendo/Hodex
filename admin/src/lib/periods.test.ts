import { describe, expect, it } from 'vitest'
import { formatShortDate, periodRange, todayInSpain } from './periods'

describe('periodRange', () => {
  // 30 sep 2026, 00:30 en Madrid = 29 sep 22:30 UTC: en Madrid ya es día 30.
  const now = new Date('2026-09-29T22:30:00Z')

  it('usa la fecha de Madrid, no la UTC', () => {
    expect(todayInSpain(now)).toBe('2026-09-30')
  })

  it('mes, trimestre y año actuales', () => {
    expect(periodRange('month', now)).toEqual({ from: '2026-09-01', to: '2026-09-30' })
    expect(periodRange('quarter', now)).toEqual({ from: '2026-07-01', to: '2026-09-30' })
    expect(periodRange('year', now)).toEqual({ from: '2026-01-01', to: '2026-12-31' })
    expect(periodRange('all', now)).toEqual({})
  })

  it('el trimestre anterior al 1T es el 4T del año pasado', () => {
    expect(periodRange('prev-quarter', new Date('2026-02-10T12:00:00Z'))).toEqual({
      from: '2025-10-01',
      to: '2025-12-31',
    })
  })

  it('febrero bisiesto', () => {
    expect(periodRange('month', new Date('2028-02-15T12:00:00Z'))).toEqual({
      from: '2028-02-01',
      to: '2028-02-29',
    })
  })
})

describe('formatShortDate', () => {
  it('formatea sin desfase de zona horaria', () => {
    expect(formatShortDate('2026-01-01')).toMatch(/^1 ene 2026$/)
  })
})
