/**
 * Validación de identificadores fiscales españoles con su dígito de control:
 *  - DNI:  8 dígitos + letra                      (12345678Z)
 *  - NIE:  X/Y/Z + 7 dígitos + letra              (X1234567L)
 *  - NIF especial: K/L/M + 7 dígitos + letra      (K1234567L)
 *  - CIF:  letra de entidad + 7 dígitos + control (B12345674, P1234567D)
 * Acepta el prefijo de IVA intracomunitario `ES` y separadores habituales.
 */

export type SpanishTaxIdKind = 'dni' | 'nie' | 'nif_especial' | 'cif'

const DNI_LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKE'
const CIF_CONTROL_LETTERS = 'JABCDEFGHI'
// Entidades cuyo control es siempre letra / siempre dígito (el resto admite ambos).
const CIF_LETTER_CONTROL = new Set(['N', 'P', 'Q', 'R', 'S', 'W'])
const CIF_DIGIT_CONTROL = new Set(['A', 'B', 'E', 'H'])

/** Mayúsculas, sin espacios, guiones ni puntos. */
export function normalizeTaxId(raw: string): string {
  return raw.toUpperCase().replace(/[\s.-]/g, '')
}

function dniLetter(digits: string): string {
  return DNI_LETTERS[Number(digits) % 23]!
}

function cifControlDigit(digits: string): number {
  let sum = 0
  for (let i = 0; i < 7; i++) {
    const n = Number(digits[i])
    if (i % 2 === 0) {
      // Posiciones impares (1ª, 3ª…): doble y suma de sus cifras.
      const doubled = n * 2
      sum += Math.floor(doubled / 10) + (doubled % 10)
    } else {
      sum += n
    }
  }
  return (10 - (sum % 10)) % 10
}

export interface SpanishTaxIdResult {
  valid: boolean
  /** Identificador normalizado (sin prefijo ES). */
  normalized: string
  kind?: SpanishTaxIdKind
}

export function validateSpanishTaxId(raw: string): SpanishTaxIdResult {
  let value = normalizeTaxId(raw)
  // IVA intracomunitario: ESB12345674 → B12345674 (sin romper un DNI tipo "ES…").
  if (value.length === 11 && value.startsWith('ES')) value = value.slice(2)

  const invalid = { valid: false, normalized: value }

  let match = /^(\d{8})([A-Z])$/.exec(value)
  if (match) {
    return dniLetter(match[1]!) === match[2] ? { valid: true, normalized: value, kind: 'dni' } : invalid
  }

  match = /^([XYZ])(\d{7})([A-Z])$/.exec(value)
  if (match) {
    const prefix = String('XYZ'.indexOf(match[1]!))
    return dniLetter(prefix + match[2]) === match[3]
      ? { valid: true, normalized: value, kind: 'nie' }
      : invalid
  }

  match = /^([KLM])(\d{7})([A-Z])$/.exec(value)
  if (match) {
    return dniLetter(match[2]!) === match[3]
      ? { valid: true, normalized: value, kind: 'nif_especial' }
      : invalid
  }

  match = /^([ABCDEFGHJNPQRSUVW])(\d{7})([0-9A-J])$/.exec(value)
  if (match) {
    const [, entity, digits, control] = match as unknown as [string, string, string, string]
    const digit = cifControlDigit(digits)
    const letter = CIF_CONTROL_LETTERS[digit]!
    const ok = CIF_LETTER_CONTROL.has(entity)
      ? control === letter
      : CIF_DIGIT_CONTROL.has(entity)
        ? control === String(digit)
        : control === letter || control === String(digit)
    return ok ? { valid: true, normalized: value, kind: 'cif' } : invalid
  }

  return invalid
}
