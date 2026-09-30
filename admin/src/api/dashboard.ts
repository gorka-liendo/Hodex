import { api } from './client'

export interface DashboardData {
  month: { from: string; to: string; expensesBaseCents: number; expensesCount: number }
  quarter: { from: string; to: string; quarter: number; year: number; deductibleVatCents: number }
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
