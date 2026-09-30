/**
 * Importes en el panel. La API trabaja en céntimos enteros; aquí se traducen
 * desde y hacia lo que escribe y lee una persona en España.
 */

const euros = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
})

/** 123456 → "1234,56 €" (formato español). */
export function formatCents(cents: number): string {
  // `|| 0` convierte −0 en 0: una retención nula no debe verse como "-0,00 €".
  return euros.format((cents || 0) / 100)
}

/** 2100 → "21 %". */
export function formatRate(bp: number): string {
  return `${new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 }).format(bp / 100)} %`
}

/**
 * Interpreta un importe escrito a mano y lo devuelve en céntimos, o null si no
 * es válido. Acepta "1.234,56", "1234,56", "1234.56", "1 234,5", "-20", "12 €".
 * Regla: el ÚLTIMO separador seguido de 1-2 cifras es el decimal; el resto de
 * puntos/espacios son separadores de miles.
 */
export function parseAmountToCents(input: string): number | null {
  // `\s` cubre también el espacio duro que Intl usa al formatear euros.
  const cleaned = input.replace(/[€\s]/g, '')
  if (!/^-?[\d.,]+$/.test(cleaned)) return null

  const negative = cleaned.startsWith('-')
  const body = negative ? cleaned.slice(1) : cleaned
  const match = /^(.*?)([.,])(\d{1,2})$/.exec(body)
  const thousands = match ? match[1]! : body
  const decimalSeparator = match?.[2]
  const integerPart = thousands.replace(/[.,]/g, '')
  const decimalPart = match ? match[3]!.padEnd(2, '0') : '00'

  if (!/^\d+$/.test(integerPart)) return null
  // Los miles solo pueden ir en grupos de 3 ("1.234" sí, "12.34.5" no)…
  if (/[.,]/.test(thousands) && !/^\d{1,3}([.,]\d{3})+$/.test(thousands)) return null
  // …y nunca con el mismo signo que el decimal ("12,345,6" es ambiguo).
  if (decimalSeparator && thousands.includes(decimalSeparator)) return null

  const cents = Number(integerPart) * 100 + Number(decimalPart)
  if (!Number.isSafeInteger(cents)) return null
  return negative ? -cents : cents
}

/** Céntimos → texto editable ("1234,56"), para rellenar un formulario. */
export function centsToInput(cents: number): string {
  const sign = cents < 0 ? '-' : ''
  const abs = Math.abs(cents)
  return `${sign}${Math.floor(abs / 100)},${String(abs % 100).padStart(2, '0')}`
}

/**
 * Mismo cálculo que el servidor (redondeo "mitad hacia fuera"), solo para la
 * vista previa del formulario. El importe que cuenta es el que calcula la API.
 */
export function applyRate(cents: number, rateBp: number): number {
  const product = cents * rateBp
  const rounded = Math.floor((Math.abs(product) + 5_000) / 10_000)
  return product < 0 ? -rounded : rounded
}

/**
 * Cantidad escrita a mano → milésimas (la API guarda 1,5 como 1500). Hasta 3
 * decimales, con coma o punto. Devuelve null si no es válida.
 */
export function parseQuantityToMilli(input: string): number | null {
  const cleaned = input.trim().replace(/\s/g, '')
  const match = /^(-?)(\d+)(?:[.,](\d{1,3}))?$/.exec(cleaned)
  if (!match) return null
  const milli = Number(match[2]) * 1_000 + Number((match[3] ?? '').padEnd(3, '0'))
  if (!Number.isSafeInteger(milli)) return null
  return match[1] ? -milli : milli
}

/** Milésimas → texto ("1500" → "1,5"; "2000" → "2"). */
export function milliToInput(milli: number): string {
  const sign = milli < 0 ? '-' : ''
  const abs = Math.abs(milli)
  const decimals = String(abs % 1_000).padStart(3, '0').replace(/0+$/, '')
  return `${sign}${Math.floor(abs / 1_000)}${decimals ? `,${decimals}` : ''}`
}

/** Precio × cantidad en milésimas, redondeo mitad hacia fuera (igual que el servidor). */
export function multiplyQuantity(unitCents: number, quantityMilli: number): number {
  const product = unitCents * quantityMilli
  const rounded = Math.floor((Math.abs(product) + 500) / 1_000)
  return product < 0 ? -rounded : rounded
}
