import { applyRate, multiplyQuantity } from './money.js'

export interface LineInput {
  quantityMilli: number
  unitPriceCents: number
  vatRateBp: number
}

export interface VatGroup {
  rateBp: number
  baseCents: number
  vatCents: number
}

export interface InvoiceTotals {
  /** Base de cada línea, en el mismo orden que la entrada. */
  lineBases: number[]
  /** Desglose por tipo de IVA (como exige la normativa en la factura). */
  vatBreakdown: VatGroup[]
  baseCents: number
  vatCents: number
  irpfCents: number
  totalCents: number
}

/**
 * Totales de una factura según la práctica española:
 *  1. base de cada línea = cantidad × precio (redondeada al céntimo);
 *  2. IVA por TIPO: se suman las bases de cada tipo y se aplica el tipo al
 *     grupo (no línea a línea, que acumularía errores de redondeo);
 *  3. retención de IRPF sobre la base total;
 *  4. total = base + IVA − IRPF.
 * Todo en enteros. Lo usa el servidor al guardar y al emitir.
 */
export function computeInvoiceTotals(lines: LineInput[], irpfRateBp: number): InvoiceTotals {
  const lineBases = lines.map((line) => multiplyQuantity(line.unitPriceCents, line.quantityMilli))

  const byRate = new Map<number, number>()
  lines.forEach((line, i) => {
    byRate.set(line.vatRateBp, (byRate.get(line.vatRateBp) ?? 0) + lineBases[i]!)
  })
  const vatBreakdown = [...byRate.entries()]
    .sort(([a], [b]) => b - a)
    .map(([rateBp, baseCents]) => ({ rateBp, baseCents, vatCents: applyRate(baseCents, rateBp) }))

  const baseCents = lineBases.reduce((sum, value) => sum + value, 0)
  const vatCents = vatBreakdown.reduce((sum, group) => sum + group.vatCents, 0)
  const irpfCents = applyRate(baseCents, irpfRateBp)

  return { lineBases, vatBreakdown, baseCents, vatCents, irpfCents, totalCents: baseCents + vatCents - irpfCents }
}
