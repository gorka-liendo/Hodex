import { api } from './client'

export interface DashboardData {
  month: {
    from: string
    to: string
    expensesBaseCents: number
    expensesCount: number
    invoicedBaseCents: number
    invoicedCount: number
  }
  quarter: {
    from: string
    to: string
    quarter: number
    year: number
    outputVatCents: number
    deductibleVatCents: number
    /** Estimación del modelo 303: repercutido − soportado deducible. */
    vatBalanceCents: number
  }
  receivables: { outstandingCents: number; outstandingCount: number; overdueCents: number; overdueCount: number }
  unpaidExpenses: { totalCents: number; count: number }
}

export const dashboardApi = {
  get: () => api.get<DashboardData>('/dashboard'),
}

/**
 * Cuelga de la clave de gastos: cualquier invalidación de `['expenses']`
 * (crear, editar, eliminar) refresca también el resumen.
 */
export const dashboardKeys = {
  all: ['expenses', 'dashboard'] as const,
}
