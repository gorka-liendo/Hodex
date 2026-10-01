import type { VatGroup } from '../../lib/invoiceMath.js'
import { applyRate } from '../../lib/money.js'

/**
 * Cálculo orientativo de los modelos 303 (IVA) y 130 (pago fraccionado de
 * IRPF, estimación directa) a partir de facturas emitidas y gastos. Funciones
 * puras: reciben los datos ya cargados y no tocan la BD.
 */

/** Estados miembros de la UE salvo España (para operaciones intracomunitarias). */
const EU_COUNTRIES = new Set([
  'AT', 'BE', 'BG', 'CY', 'CZ', 'DE', 'DK', 'EE', 'FI', 'FR', 'GR', 'HR', 'HU', 'IE',
  'IT', 'LT', 'LU', 'LV', 'MT', 'NL', 'PL', 'PT', 'RO', 'SE', 'SI', 'SK',
])

/** Bienes de inversión a efectos de IVA: más de 3.005,06 € de base. */
const INVESTMENT_GOODS_THRESHOLD_CENTS = 300_506
/** Por encima de 300 € un equipo debería amortizarse en IRPF, no deducirse de golpe. */
const AMORTIZATION_HINT_CENTS = 30_000

export interface InvoiceForTax {
  id: string
  fullNumber: string
  issueDate: string
  clientCountry: string
  irpfCents: number
  baseCents: number
  vatGroups: VatGroup[]
}

export interface ExpenseForTax {
  id: string
  issueDate: string
  description: string
  category: string
  baseCents: number
  vatRateBp: number
  vatCents: number
  vatDeductible: boolean
  supplierCountry: string | null
  hasSupplier: boolean
  attachmentCount: number
}

export interface Quarter {
  year: number
  quarter: 1 | 2 | 3 | 4
}

const pad = (n: number) => String(n).padStart(2, '0')

export function quarterRange({ year, quarter }: Quarter): { from: string; to: string } {
  const firstMonth = (quarter - 1) * 3 + 1
  const lastMonth = firstMonth + 2
  const lastDay = new Date(Date.UTC(year, lastMonth, 0)).getUTCDate()
  return { from: `${year}-${pad(firstMonth)}-01`, to: `${year}-${pad(lastMonth)}-${pad(lastDay)}` }
}

/** Plazo de presentación: del 1 al 20 del mes siguiente (el 4T, hasta el 30 de enero). */
export function filingDeadline({ year, quarter }: Quarter): { from: string; to: string } {
  if (quarter === 4) return { from: `${year + 1}-01-01`, to: `${year + 1}-01-30` }
  const month = pad(quarter * 3 + 1)
  return { from: `${year}-${month}-01`, to: `${year}-${month}-20` }
}

/** El trimestre que toca declarar: el último terminado. */
export function quarterToFile(today: string): Quarter {
  const [year, month] = today.split('-').map(Number) as [number, number]
  const current = Math.ceil(month / 3)
  return current === 1 ? { year: year - 1, quarter: 4 } : { year, quarter: (current - 1) as Quarter['quarter'] }
}

// ─── Modelo 303 ──────────────────────────────────────────────────────────────

export interface Box {
  /** Número de casilla del modelo (orientativo). */
  box: string
  label: string
  cents: number
}

export interface Model303 {
  /** Devengado por tipo: base y cuota (casillas 01-09). */
  accrued: Array<{ rateBp: number; baseBox: string | null; vatBox: string | null; baseCents: number; vatCents: number }>
  totalAccruedVatCents: number
  deductible: Box[]
  totalDeductibleCents: number
  /** Informativas: operaciones sin IVA español. */
  informative: Box[]
  resultCents: number
}

const RATE_BOXES: Record<number, [string, string]> = { 400: ['01', '03'], 1000: ['04', '06'], 2100: ['07', '09'] }

export function compute303(invoices: InvoiceForTax[], expenses: ExpenseForTax[]): Model303 {
  const byRate = new Map<number, { baseCents: number; vatCents: number }>()
  let intraEuCents = 0
  let notSubjectCents = 0
  let exemptCents = 0

  for (const invoice of invoices) {
    const foreign = invoice.clientCountry !== 'ES'
    for (const group of invoice.vatGroups) {
      if (group.rateBp === 0) {
        if (!foreign) exemptCents += group.baseCents
        else if (EU_COUNTRIES.has(invoice.clientCountry)) intraEuCents += group.baseCents
        else notSubjectCents += group.baseCents
        continue
      }
      const bucket = byRate.get(group.rateBp) ?? { baseCents: 0, vatCents: 0 }
      bucket.baseCents += group.baseCents
      bucket.vatCents += group.vatCents
      byRate.set(group.rateBp, bucket)
    }
  }

  const accrued = [...byRate.entries()]
    .sort(([a], [b]) => a - b)
    .map(([rateBp, sums]) => ({
      rateBp,
      baseBox: RATE_BOXES[rateBp]?.[0] ?? null,
      vatBox: RATE_BOXES[rateBp]?.[1] ?? null,
      ...sums,
    }))
  const totalAccruedVatCents = accrued.reduce((sum, row) => sum + row.vatCents, 0)

  let currentBase = 0
  let currentVat = 0
  let investmentBase = 0
  let investmentVat = 0
  for (const expense of expenses) {
    if (!expense.vatDeductible || expense.vatCents === 0) continue
    if (expense.category === 'hardware' && expense.baseCents > INVESTMENT_GOODS_THRESHOLD_CENTS) {
      investmentBase += expense.baseCents
      investmentVat += expense.vatCents
    } else {
      currentBase += expense.baseCents
      currentVat += expense.vatCents
    }
  }

  const deductible: Box[] = [
    { box: '28', label: 'Base de compras y gastos corrientes', cents: currentBase },
    { box: '29', label: 'IVA soportado en compras y gastos corrientes', cents: currentVat },
  ]
  if (investmentBase !== 0) {
    deductible.push(
      { box: '30', label: 'Base de bienes de inversión', cents: investmentBase },
      { box: '31', label: 'IVA soportado en bienes de inversión', cents: investmentVat },
    )
  }
  const totalDeductibleCents = currentVat + investmentVat

  const informative: Box[] = []
  if (intraEuCents) informative.push({ box: '59', label: 'Entregas y servicios intracomunitarios (clientes de la UE)', cents: intraEuCents })
  if (notSubjectCents) informative.push({ box: '120', label: 'Operaciones no sujetas por reglas de localización (clientes fuera de la UE)', cents: notSubjectCents })
  if (exemptCents) informative.push({ box: '—', label: 'Operaciones en España sin IVA (exentas): consulta la casilla con tu gestoría', cents: exemptCents })

  return {
    accrued,
    totalAccruedVatCents,
    deductible,
    totalDeductibleCents,
    informative,
    resultCents: totalAccruedVatCents - totalDeductibleCents,
  }
}

// ─── Modelo 130 ──────────────────────────────────────────────────────────────

export interface Model130 {
  incomeCents: number // 01
  expensesCents: number // 02
  netCents: number // 03
  twentyPercentCents: number // 04
  previousPaymentsCents: number // 05
  withholdingsCents: number // 06
  resultCents: number // 07
  /** Lo que se ingresa (0 si el resultado es negativo). */
  toPayCents: number
}

/** Gasto deducible en IRPF: la base, más el IVA si no se puede deducir en el 303. */
const irpfExpense = (e: ExpenseForTax) => e.baseCents + (e.vatDeductible ? 0 : e.vatCents)

/**
 * Modelo 130 del trimestre: datos acumulados desde el 1 de enero. Los pagos de
 * trimestres anteriores (casilla 05) se calculan con la misma regla, así que un
 * trimestre en negativo se compensa solo en los siguientes.
 */
export function compute130(target: Quarter, invoicesYtd: InvoiceForTax[], expensesYtd: ExpenseForTax[]): Model130 {
  let previousPayments = 0
  let model!: Model130
  for (let q = 1; q <= target.quarter; q++) {
    const { to } = quarterRange({ year: target.year, quarter: q as Quarter['quarter'] })
    const invoices = invoicesYtd.filter((i) => i.issueDate <= to)
    const expenses = expensesYtd.filter((e) => e.issueDate <= to)
    const incomeCents = invoices.reduce((sum, i) => sum + i.baseCents, 0)
    const expensesCents = expenses.reduce((sum, e) => sum + irpfExpense(e), 0)
    const netCents = incomeCents - expensesCents
    const twentyPercentCents = netCents > 0 ? applyRate(netCents, 2000) : 0
    const withholdingsCents = invoices.reduce((sum, i) => sum + i.irpfCents, 0)
    const resultCents = twentyPercentCents - previousPayments - withholdingsCents
    model = {
      incomeCents,
      expensesCents,
      netCents,
      twentyPercentCents,
      previousPaymentsCents: previousPayments,
      withholdingsCents,
      resultCents,
      toPayCents: Math.max(0, resultCents),
    }
    previousPayments += model.toPayCents
  }
  return model
}

// ─── Avisos ──────────────────────────────────────────────────────────────────

export interface TaxWarning {
  code: string
  message: string
  count: number
}

export function taxWarnings(expenses: ExpenseForTax[], draftInvoices: number): TaxWarning[] {
  const warnings: TaxWarning[] = []
  const add = (code: string, count: number, one: string, other: string) => {
    if (count > 0) warnings.push({ code, count, message: count === 1 ? one : other })
  }

  add(
    'drafts',
    draftInvoices,
    'factura en borrador con fecha del trimestre: no cuenta hasta que la emitas.',
    'facturas en borrador con fecha del trimestre: no cuentan hasta que las emitas.',
  )
  const reverseCharge = 'posible inversión del sujeto pasivo (p. ej. suscripciones de software). Coméntalo con tu gestoría.'
  add(
    'reverse_charge',
    expenses.filter((e) => e.supplierCountry && e.supplierCountry !== 'ES' && e.vatCents === 0).length,
    `gasto de un proveedor extranjero sin IVA: ${reverseCharge}`,
    `gastos de proveedores extranjeros sin IVA: ${reverseCharge}`,
  )
  const invoiceNeeded = 'para deducir el IVA hace falta factura a tu nombre con el NIF del proveedor.'
  add(
    'no_supplier',
    expenses.filter((e) => e.vatDeductible && e.vatCents !== 0 && !e.hasSupplier).length,
    `gasto con IVA deducible sin proveedor: ${invoiceNeeded}`,
    `gastos con IVA deducible sin proveedor: ${invoiceNeeded}`,
  )
  add(
    'no_receipt',
    expenses.filter((e) => e.attachmentCount === 0).length,
    'gasto sin ticket ni factura adjunta.',
    'gastos sin ticket ni factura adjunta.',
  )
  add(
    'amortization',
    expenses.filter((e) => e.category === 'hardware' && e.baseCents > AMORTIZATION_HINT_CENTS).length,
    'equipo de más de 300 €: en IRPF suele amortizarse en varios años; aquí se deduce entero.',
    'equipos de más de 300 €: en IRPF suelen amortizarse en varios años; aquí se deducen enteros.',
  )
  return warnings
}
