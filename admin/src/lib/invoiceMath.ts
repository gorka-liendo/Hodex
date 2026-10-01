import { applyRate, multiplyQuantity } from './money'

/**
 * Copia del cálculo del servidor (backend/src/lib/invoiceMath.ts) para la
 * vista previa del editor. El importe que vale es el que devuelve la API.
 */
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

export function computeInvoiceTotals(lines: LineInput[], irpfRateBp: number) {
  const lineBases = lines.map((line) => multiplyQuantity(line.unitPriceCents, line.quantityMilli))
  const byRate = new Map<number, number>()
  lines.forEach((line, i) => byRate.set(line.vatRateBp, (byRate.get(line.vatRateBp) ?? 0) + lineBases[i]!))
  const vatBreakdown: VatGroup[] = [...byRate.entries()]
    .sort(([a], [b]) => b - a)
    .map(([rateBp, baseCents]) => ({ rateBp, baseCents, vatCents: applyRate(baseCents, rateBp) }))
  const baseCents = lineBases.reduce((sum, v) => sum + v, 0)
  const vatCents = vatBreakdown.reduce((sum, g) => sum + g.vatCents, 0)
  const irpfCents = applyRate(baseCents, irpfRateBp)
  return { lineBases, vatBreakdown, baseCents, vatCents, irpfCents, totalCents: baseCents + vatCents - irpfCents }
}
