import type { ExpenseCategory } from '../../db/schema/index.js'
import { breakdownFromTotal, MAX_AMOUNT_CENTS } from '../../lib/money.js'
import { normalizeTaxId } from '../../lib/taxId.js'
import type { RawExtraction } from './claudeReader.js'

/** Tipos que ofrece el formulario de gastos. */
const VAT_RATES = new Set([0, 400, 1000, 2100])
const IRPF_RATES = new Set([0, 700, 1500, 1900])

/** Propuesta para rellenar el formulario. Todo es opcional y el usuario lo revisa. */
export interface ExpenseSuggestion {
  issueDate: string | null
  invoiceNumber: string | null
  description: string | null
  category: ExpenseCategory | null
  supplier: { name: string | null; taxId: string | null } | null
  totalCents: number | null
  vatRateBp: number | null
  irpfRateBp: number | null
  warnings: string[]
}

function validDate(value: string | null, today: string): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const time = Date.parse(`${value}T00:00:00Z`)
  if (Number.isNaN(time) || new Date(time).toISOString().slice(0, 10) !== value) return null
  return value >= '2000-01-01' && value <= today ? value : null
}

const clean = (value: string | null, max: number) => {
  const text = value?.replace(/\s+/g, ' ').trim().slice(0, max)
  return text ? text : null
}

/**
 * Convierte la lectura de Claude en una propuesta que el formulario acepta:
 * solo tipos de IVA/IRPF del formulario, importes en euros y con sentido, y
 * fechas reales. Lo que no encaja se descarta con un aviso, nunca se fuerza.
 */
export function toSuggestion(raw: RawExtraction, today: string): ExpenseSuggestion {
  const warnings = raw.warnings.map((w) => w.trim()).filter(Boolean)

  if (!raw.isExpenseDocument) {
    return {
      issueDate: null,
      invoiceNumber: null,
      description: null,
      category: null,
      supplier: null,
      totalCents: null,
      vatRateBp: null,
      irpfRateBp: null,
      warnings: ['No parece un ticket ni una factura. Revisa el archivo.', ...warnings],
    }
  }

  // ── IVA: el formulario guarda un tipo por gasto ─────────────────────────
  let vatRateBp: number | null = null
  const rates = [...new Set(raw.vatLines.map((l) => l.rateBp))]
  if (rates.length > 0) {
    const main = [...raw.vatLines].sort((a, b) => Math.abs(b.baseCents) - Math.abs(a.baseCents))[0]!
    if (rates.length > 1) {
      warnings.push('Tiene varios tipos de IVA; se propone el principal. Revisa el desglose o regístralo en varios gastos.')
    }
    if (VAT_RATES.has(main.rateBp)) vatRateBp = main.rateBp
    else warnings.push(`IVA del ${main.rateBp / 100} % no habitual: elige el tipo a mano.`)
  }

  let irpfRateBp: number | null = raw.irpfRateBp ?? 0
  if (!IRPF_RATES.has(irpfRateBp)) {
    warnings.push(`Retención del ${irpfRateBp / 100} % no habitual: revísala.`)
    irpfRateBp = null
  }

  // ── Importe pagado ──────────────────────────────────────────────────────
  let totalCents =
    raw.totalCents ??
    (raw.vatLines.length > 0 ? raw.vatLines.reduce((sum, l) => sum + l.baseCents + l.vatCents, 0) : null)

  const currency = raw.currency?.toUpperCase() ?? 'EUR'
  if (currency !== 'EUR') {
    warnings.push(`El documento está en ${currency}: escribe el importe en euros que te cargaron.`)
    totalCents = null
  }
  if (totalCents !== null && (totalCents <= 0 || totalCents > MAX_AMOUNT_CENTS)) totalCents = null

  // ¿Cuadra el total con el desglose leído? (solo con un único tipo)
  if (totalCents !== null && vatRateBp !== null && irpfRateBp !== null && raw.vatLines.length === 1) {
    const expected = breakdownFromTotal(totalCents, vatRateBp, irpfRateBp)
    if (Math.abs(expected.baseCents - raw.vatLines[0]!.baseCents) > 2) {
      warnings.push('El total y el desglose del documento no cuadran del todo: revísalos.')
    }
  }

  const supplierName = clean(raw.supplierName, 200)
  const supplierTaxId = raw.supplierTaxId ? normalizeTaxId(raw.supplierTaxId).slice(0, 20) || null : null

  return {
    issueDate: validDate(raw.issueDate, today),
    invoiceNumber: clean(raw.invoiceNumber, 60),
    description: clean(raw.description, 300),
    category: raw.category,
    supplier: supplierName || supplierTaxId ? { name: supplierName, taxId: supplierTaxId } : null,
    totalCents,
    vatRateBp,
    irpfRateBp,
    warnings: [...new Set(warnings)].slice(0, 8),
  }
}
