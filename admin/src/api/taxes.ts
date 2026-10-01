import { api } from './client'

export interface TaxBox {
  box: string
  label: string
  cents: number
}

export interface QuarterTaxes {
  period: { year: number; quarter: 1 | 2 | 3 | 4; from: string; to: string }
  deadline: { from: string; to: string }
  counts: { invoices: number; expenses: number }
  model303: {
    accrued: Array<{ rateBp: number; baseBox: string | null; vatBox: string | null; baseCents: number; vatCents: number }>
    totalAccruedVatCents: number
    deductible: TaxBox[]
    totalDeductibleCents: number
    informative: TaxBox[]
    resultCents: number
  }
  model130: {
    incomeCents: number
    expensesCents: number
    netCents: number
    twentyPercentCents: number
    previousPaymentsCents: number
    withholdingsCents: number
    resultCents: number
    toPayCents: number
  }
  warnings: Array<{ code: string; message: string; count: number }>
}

export interface TaxPeriod {
  year: number
  quarter: number
}

const query = (p: TaxPeriod | null) => (p ? `?year=${p.year}&quarter=${p.quarter}` : '')

export const taxesApi = {
  /** Sin periodo: el último trimestre terminado (el que toca declarar). */
  get: (period: TaxPeriod | null) => api.get<QuarterTaxes>(`/taxes${query(period)}`),
  book: (period: TaxPeriod, book: 'ingresos' | 'gastos') => api.download(`/taxes/books/${book}${query(period)}`, 'text/csv'),
  package: (period: TaxPeriod) => api.download(`/taxes/package${query(period)}`, 'application/zip'),
}

export const taxKeys = {
  all: ['taxes'] as const,
  quarter: (period: TaxPeriod | null) => ['taxes', period] as const,
}
