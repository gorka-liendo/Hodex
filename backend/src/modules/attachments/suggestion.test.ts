import { describe, expect, it } from 'vitest'
import type { RawExtraction } from './claudeReader.js'
import { toSuggestion } from './suggestion.js'

const TODAY = '2026-10-01'

const raw = (override: Partial<RawExtraction> = {}): RawExtraction => ({
  isExpenseDocument: true,
  supplierName: 'Figma, Inc.',
  supplierTaxId: 'es b-12345674',
  invoiceNumber: 'INV-2026-001',
  issueDate: '2026-09-25',
  currency: 'EUR',
  totalCents: 1500,
  vatLines: [{ rateBp: 2100, baseCents: 1240, vatCents: 260 }],
  irpfRateBp: null,
  description: 'Suscripción Figma (septiembre)',
  category: 'software',
  warnings: [],
  ...override,
})

describe('toSuggestion', () => {
  it('propone los datos del ticket listos para el formulario', () => {
    expect(toSuggestion(raw(), TODAY)).toEqual({
      issueDate: '2026-09-25',
      invoiceNumber: 'INV-2026-001',
      description: 'Suscripción Figma (septiembre)',
      category: 'software',
      supplier: { name: 'Figma, Inc.', taxId: 'ESB12345674' },
      totalCents: 1500,
      vatRateBp: 2100,
      irpfRateBp: 0,
      warnings: [],
    })
  })

  it('en otra moneda no propone importe y avisa', () => {
    const s = toSuggestion(raw({ currency: 'usd' }), TODAY)
    expect(s.totalCents).toBeNull()
    expect(s.warnings.join()).toContain('USD')
  })

  it('con varios tipos de IVA propone el principal y avisa', () => {
    const s = toSuggestion(
      raw({
        totalCents: 3310,
        vatLines: [
          { rateBp: 1000, baseCents: 2000, vatCents: 200 },
          { rateBp: 2100, baseCents: 917, vatCents: 193 },
        ],
      }),
      TODAY,
    )
    expect(s.vatRateBp).toBe(1000)
    expect(s.warnings.join()).toContain('varios tipos')
  })

  it('descarta tipos que el formulario no ofrece', () => {
    const s = toSuggestion(raw({ vatLines: [{ rateBp: 500, baseCents: 1000, vatCents: 50 }], irpfRateBp: 1200 }), TODAY)
    expect(s.vatRateBp).toBeNull()
    expect(s.irpfRateBp).toBeNull()
    expect(s.warnings).toHaveLength(2)
  })

  it('descarta fechas imposibles o futuras', () => {
    expect(toSuggestion(raw({ issueDate: '2026-02-30' }), TODAY).issueDate).toBeNull()
    expect(toSuggestion(raw({ issueDate: '2027-01-01' }), TODAY).issueDate).toBeNull()
    expect(toSuggestion(raw({ issueDate: '25/09/2026' }), TODAY).issueDate).toBeNull()
  })

  it('avisa si el total y el desglose no cuadran', () => {
    const s = toSuggestion(raw({ totalCents: 2000 }), TODAY)
    expect(s.warnings.join()).toContain('no cuadran')
  })

  it('sin total, lo calcula a partir del desglose', () => {
    expect(toSuggestion(raw({ totalCents: null }), TODAY).totalCents).toBe(1500)
  })

  it('si no es un ticket, no propone nada', () => {
    const s = toSuggestion(raw({ isExpenseDocument: false }), TODAY)
    expect(s.totalCents).toBeNull()
    expect(s.supplier).toBeNull()
    expect(s.warnings[0]).toContain('No parece')
  })
})
