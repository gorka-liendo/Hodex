import { createHash } from 'node:crypto'

/**
 * Huella encadenada de cada factura emitida, con la misma cadena de campos que
 * el registro de alta de Verifactu (Orden HAC/1177/2024): cada huella incluye
 * la de la factura anterior, así que alterar o borrar una factura rompe la
 * cadena de todas las posteriores y se detecta.
 *
 * ⚠️ Preparado para Verifactu, pero NO es todavía el envío a la AEAT: el
 * formato exacto debe validarse con sus servicios de prueba al integrarlo.
 */
export interface HashFields {
  issuerTaxId: string
  fullNumber: string
  /** AAAA-MM-DD */
  issueDate: string
  kind: 'standard' | 'rectifying'
  vatCents: number
  /** Importe total de la factura (base + IVA). */
  amountCents: number
  previousHash: string | null
  issuedAt: Date
}

const euros = (cents: number) => {
  const sign = cents < 0 ? '-' : ''
  const abs = Math.abs(cents)
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`
}

/** "2026-09-30" → "30-09-2026" (formato de fecha de Verifactu). */
const ddmmyyyy = (isoDate: string) => isoDate.split('-').reverse().join('-')

/** Fecha-hora en Madrid con su huso: "2026-09-30T10:15:00+02:00". */
export function madridTimestamp(date: Date): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Madrid',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
      timeZoneName: 'longOffset',
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  )
  const offset = parts.timeZoneName === 'GMT' ? '+00:00' : parts.timeZoneName!.replace('GMT', '')
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}${offset}`
}

/** Cadena canónica que se resume (útil también para auditar a mano). */
export function hashInput(fields: HashFields): string {
  return [
    `IDEmisorFactura=${fields.issuerTaxId}`,
    `NumSerieFactura=${fields.fullNumber}`,
    `FechaExpedicionFactura=${ddmmyyyy(fields.issueDate)}`,
    `TipoFactura=${fields.kind === 'rectifying' ? 'R1' : 'F1'}`,
    `CuotaTotal=${euros(fields.vatCents)}`,
    `ImporteTotal=${euros(fields.amountCents)}`,
    `Huella=${fields.previousHash ?? ''}`,
    `FechaHoraHusoGenRegistro=${madridTimestamp(fields.issuedAt)}`,
  ].join('&')
}

export function computeInvoiceHash(fields: HashFields): string {
  return createHash('sha256').update(hashInput(fields), 'utf8').digest('hex').toUpperCase()
}
