import { describe, expect, it } from 'vitest'
import { computeInvoiceHash, hashInput, madridTimestamp } from './invoiceHash.js'

const base = {
  issuerTaxId: 'B12345674',
  fullNumber: 'F-2026-0001',
  issueDate: '2026-09-30',
  kind: 'standard' as const,
  vatCents: 12_600,
  amountCents: 72_600,
  previousHash: null,
  issuedAt: new Date('2026-09-30T08:15:00Z'),
}

describe('madridTimestamp', () => {
  it('usa el huso de verano (+02:00) y de invierno (+01:00)', () => {
    expect(madridTimestamp(new Date('2026-09-30T08:15:00Z'))).toBe('2026-09-30T10:15:00+02:00')
    expect(madridTimestamp(new Date('2026-01-15T08:15:00Z'))).toBe('2026-01-15T09:15:00+01:00')
  })
})

describe('huella', () => {
  it('construye la cadena con los campos de Verifactu', () => {
    expect(hashInput(base)).toBe(
      'IDEmisorFactura=B12345674&NumSerieFactura=F-2026-0001&FechaExpedicionFactura=30-09-2026' +
        '&TipoFactura=F1&CuotaTotal=126.00&ImporteTotal=726.00&Huella=' +
        '&FechaHoraHusoGenRegistro=2026-09-30T10:15:00+02:00',
    )
  })

  it('es un SHA-256 en hexadecimal mayúsculas, determinista', () => {
    const hash = computeInvoiceHash(base)
    expect(hash).toMatch(/^[0-9A-F]{64}$/)
    expect(computeInvoiceHash(base)).toBe(hash)
  })

  it('cambia si cambia cualquier dato o la huella anterior (encadenamiento)', () => {
    const hash = computeInvoiceHash(base)
    expect(computeInvoiceHash({ ...base, amountCents: 72_601 })).not.toBe(hash)
    expect(computeInvoiceHash({ ...base, previousHash: 'A'.repeat(64) })).not.toBe(hash)
  })

  it('importes negativos (rectificativas) con signo', () => {
    expect(hashInput({ ...base, kind: 'rectifying', vatCents: -12_600, amountCents: -72_600 })).toContain(
      'TipoFactura=R1&CuotaTotal=-126.00&ImporteTotal=-726.00',
    )
  })
})
