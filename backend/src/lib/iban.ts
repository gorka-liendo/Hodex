/**
 * Validación de IBAN (ISO 13616): longitud por país conocida y dígitos de
 * control mod 97. Evita que una errata en la cuenta de cobro llegue a una factura.
 */
const LENGTHS: Record<string, number> = {
  ES: 24, PT: 25, FR: 27, DE: 22, IT: 27, NL: 18, BE: 16, IE: 22, LU: 20, AT: 20, GB: 22, AD: 24, CH: 21,
}

export function normalizeIban(raw: string): string {
  return raw.toUpperCase().replace(/[\s-]/g, '')
}

export function isValidIban(raw: string): boolean {
  const iban = normalizeIban(raw)
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(iban)) return false
  const expected = LENGTHS[iban.slice(0, 2)]
  if (expected !== undefined && iban.length !== expected) return false

  // Mover los 4 primeros al final, letras → números (A=10…Z=35) y mod 97 por tramos.
  const rearranged = iban.slice(4) + iban.slice(0, 4)
  let remainder = 0
  for (const char of rearranged) {
    const value = /\d/.test(char) ? char : String(char.charCodeAt(0) - 55)
    for (const digit of value) remainder = (remainder * 10 + Number(digit)) % 97
  }
  return remainder === 1
}

/** "ES9121000418450200051332" → "ES91 2100 0418 4502 0005 1332". */
export function formatIban(raw: string): string {
  return normalizeIban(raw).replace(/(.{4})(?=.)/g, '$1 ')
}
