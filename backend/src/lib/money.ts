/**
 * Dinero SIEMPRE en céntimos enteros (nunca floats: 0,1 + 0,2 ≠ 0,3).
 * Los tipos (IVA, IRPF) en puntos básicos: 21 % = 2100.
 */

/** Tope por importe: 1.000 millones de euros. Deja margen de sobra a los cálculos enteros. */
export const MAX_AMOUNT_CENTS = 100_000_000_000

/**
 * `cents × rate`, redondeado al céntimo "mitad hacia fuera" (0,5 → 1; −0,5 → −1),
 * el criterio habitual en facturación. Todo en enteros, sin decimales.
 */
export function applyRate(cents: number, rateBp: number): number {
  const product = cents * rateBp
  const rounded = Math.floor((Math.abs(product) + 5_000) / 10_000)
  return product < 0 ? -rounded : rounded
}

/**
 * Precio unitario × cantidad. La cantidad va en milésimas (1,5 horas = 1500)
 * para admitir fracciones sin floats; se redondea al céntimo mitad hacia fuera.
 */
export function multiplyQuantity(unitCents: number, quantityMilli: number): number {
  const product = unitCents * quantityMilli
  const rounded = Math.floor((Math.abs(product) + 500) / 1_000)
  return product < 0 ? -rounded : rounded
}

export interface Breakdown {
  baseCents: number
  vatCents: number
  irpfCents: number
  totalCents: number
}

/** Desglose de una factura: IVA sobre la base, retención de IRPF y total a pagar. */
export function computeBreakdown(baseCents: number, vatRateBp: number, irpfRateBp: number): Breakdown {
  const vatCents = applyRate(baseCents, vatRateBp)
  const irpfCents = applyRate(baseCents, irpfRateBp)
  return { baseCents, vatCents, irpfCents, totalCents: baseCents + vatCents - irpfCents }
}
