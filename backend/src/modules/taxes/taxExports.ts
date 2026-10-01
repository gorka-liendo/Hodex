import { formatDate, formatEuros } from '../../lib/format.js'
import type { QuarterTaxes, TaxExpense, TaxInvoice } from './taxes.service.js'

/**
 * CSV pensado para abrirse con doble clic en Excel en español: separador `;`,
 * coma decimal, BOM UTF-8 (para las tildes) y saltos de línea CRLF.
 */
const BOM = '﻿'

const CATEGORY_LABELS: Record<string, string> = {
  software: 'Software y suscripciones',
  hardware: 'Equipos',
  professional_services: 'Servicios profesionales',
  marketing: 'Marketing y publicidad',
  travel: 'Viajes y transporte',
  meals: 'Comidas y dietas',
  training: 'Formación',
  utilities: 'Suministros',
  rent: 'Alquiler',
  insurance: 'Seguros',
  bank_fees: 'Comisiones bancarias',
  taxes_fees: 'Tasas y tributos',
  other: 'Otros',
}

/** Importe con coma decimal y sin separador de miles (Excel lo lee como número). */
export const csvAmount = (cents: number) => (cents / 100).toFixed(2).replace('.', ',')
const csvRate = (bp: number) => String(bp / 100).replace('.', ',')

/**
 * Celda de texto: entre comillas si hace falta y neutralizando fórmulas
 * (un concepto que empiece por "=" no debe ejecutarse al abrir el archivo).
 */
export function csvText(value: string | null | undefined): string {
  let text = (value ?? '').replace(/\r?\n/g, ' ')
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`
  return /[";]/.test(text) || text !== text.trim() ? `"${text.replace(/"/g, '""')}"` : text
}

const toCsv = (rows: string[][]) => BOM + rows.map((r) => r.join(';')).join('\r\n') + '\r\n'

/** Libro de ingresos: una fila por factura y tipo de IVA. */
export function incomeCsv(invoices: TaxInvoice[]): string {
  const rows = [
    ['Fecha', 'Número', 'Tipo', 'Cliente', 'NIF cliente', 'País', 'Base imponible', 'Tipo IVA %', 'Cuota IVA', 'Retención %', 'Retención', 'Total factura', 'Cobrada el'],
  ]
  for (const invoice of invoices) {
    const groups = invoice.vatGroups.length > 0 ? invoice.vatGroups : [{ rateBp: 0, baseCents: 0, vatCents: 0 }]
    groups.forEach((group, i) => {
      const first = i === 0
      rows.push([
        formatDate(invoice.issueDate),
        csvText(invoice.fullNumber),
        invoice.kind === 'rectifying' ? 'Rectificativa' : 'Factura',
        csvText(invoice.clientSnapshot?.legalName),
        csvText(invoice.clientSnapshot?.taxId),
        invoice.clientCountry,
        csvAmount(group.baseCents),
        csvRate(group.rateBp),
        csvAmount(group.vatCents),
        // Retención y total, solo en la primera fila de cada factura (si no, se sumarían dos veces).
        first ? csvRate(invoice.irpfRateBp) : '',
        first ? csvAmount(invoice.irpfCents) : '',
        first ? csvAmount(invoice.totalCents) : '',
        first && invoice.paidOn ? formatDate(invoice.paidOn) : '',
      ])
    })
  }
  return toCsv(rows)
}

/** Libro de gastos: una fila por gasto. */
export function expensesCsv(expenses: TaxExpense[], attachmentNames: Map<string, string[]>): string {
  const rows = [
    ['Fecha', 'Nº factura', 'Proveedor', 'NIF proveedor', 'Concepto', 'Categoría', 'Base imponible', 'Tipo IVA %', 'Cuota IVA', 'IVA deducible', 'Retención', 'Total', 'Pagado el', 'Justificante'],
  ]
  for (const e of expenses) {
    rows.push([
      formatDate(e.issueDate),
      csvText(e.invoiceNumber),
      csvText(e.supplierName),
      csvText(e.supplierTaxId),
      csvText(e.description),
      CATEGORY_LABELS[e.category] ?? e.category,
      csvAmount(e.baseCents),
      csvRate(e.vatRateBp),
      csvAmount(e.vatCents),
      e.vatDeductible ? 'Sí' : 'No',
      csvAmount(e.irpfCents),
      csvAmount(e.totalCents),
      e.paidOn ? formatDate(e.paidOn) : '',
      csvText((attachmentNames.get(e.id) ?? []).join(', ')),
    ])
  }
  return toCsv(rows)
}

/** Resumen en texto plano para el paquete de la gestoría. */
export function summaryText(t: QuarterTaxes): string {
  const line = (box: string, label: string, cents: number) =>
    `  [${box.padStart(3)}] ${label.padEnd(58, '.')} ${formatEuros(cents).padStart(14)}`
  const m303 = t.model303
  const m130 = t.model130
  return [
    `HODEX · Impuestos del ${t.period.quarter}T ${t.period.year} (${formatDate(t.period.from)} – ${formatDate(t.period.to)})`,
    `Plazo de presentación: ${formatDate(t.deadline.from)} – ${formatDate(t.deadline.to)}`,
    `Cálculo orientativo generado por el panel. Revísalo antes de presentar.`,
    '',
    'MODELO 303 · IVA',
    ...m303.accrued.flatMap((r) => [
      line(r.baseBox ?? '—', `Base imponible al ${r.rateBp / 100} %`, r.baseCents),
      line(r.vatBox ?? '—', `Cuota al ${r.rateBp / 100} %`, r.vatCents),
    ]),
    line('27', 'Total cuota devengada', m303.totalAccruedVatCents),
    ...m303.deductible.map((b) => line(b.box, b.label, b.cents)),
    line('45', 'Total a deducir', m303.totalDeductibleCents),
    line('46', 'Resultado', m303.resultCents),
    ...m303.informative.map((b) => line(b.box, b.label, b.cents)),
    '',
    'MODELO 130 · IRPF (datos acumulados desde el 1 de enero)',
    line('01', 'Ingresos computables', m130.incomeCents),
    line('02', 'Gastos fiscalmente deducibles', m130.expensesCents),
    line('03', 'Rendimiento neto', m130.netCents),
    line('04', '20 % del rendimiento neto', m130.twentyPercentCents),
    line('05', 'Pagos fraccionados de trimestres anteriores', m130.previousPaymentsCents),
    line('06', 'Retenciones e ingresos a cuenta', m130.withholdingsCents),
    line('07', 'Resultado', m130.resultCents),
    '',
    ...(t.warnings.length > 0 ? ['AVISOS', ...t.warnings.map((w) => `  · ${w.count} ${w.message}`), ''] : []),
    `Facturas emitidas en el trimestre: ${t.counts.invoices} · Gastos: ${t.counts.expenses}`,
    '',
  ].join('\r\n')
}
