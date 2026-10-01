import { api, type Page } from './client'

export const EXPENSE_CATEGORIES = {
  software: 'Software y suscripciones',
  hardware: 'Equipos',
  professional_services: 'Servicios profesionales',
  marketing: 'Marketing y publicidad',
  travel: 'Viajes y transporte',
  meals: 'Comidas y dietas',
  training: 'Formación',
  utilities: 'Suministros (luz, internet, teléfono)',
  rent: 'Alquiler',
  insurance: 'Seguros',
  bank_fees: 'Comisiones bancarias',
  taxes_fees: 'Tasas y tributos',
  other: 'Otros',
} as const

export type ExpenseCategory = keyof typeof EXPENSE_CATEGORIES

export interface Expense {
  id: string
  supplierId: string | null
  supplier: { id: string; legalName: string; taxId: string | null } | null
  issueDate: string
  invoiceNumber: string | null
  description: string
  category: ExpenseCategory
  baseCents: number
  vatRateBp: number
  vatCents: number
  irpfRateBp: number
  irpfCents: number
  totalCents: number
  vatDeductible: boolean
  paidOn: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

/** Lo que envía el formulario: importes derivados (IVA, total…) los calcula la API. */
export interface ExpenseInput {
  supplierId: string | null
  issueDate: string
  invoiceNumber: string
  description: string
  category: ExpenseCategory
  baseCents: number
  vatRateBp: number
  irpfRateBp: number
  vatDeductible: boolean
  paidOn: string | null
  notes: string
}

export interface ExpenseFilters {
  q?: string
  category?: ExpenseCategory
  from?: string
  to?: string
  status?: 'all' | 'paid' | 'unpaid'
  page?: number
  pageSize?: number
}

export interface ExpenseSums {
  baseCents: number
  vatCents: number
  deductibleVatCents: number
  totalCents: number
}

export const expensesApi = {
  list: (filters: ExpenseFilters) =>
    api.get<Page<Expense> & { sums: ExpenseSums }>('/expenses', { ...filters }),
  get: (id: string) => api.get<Expense>(`/expenses/${id}`),
  create: (input: ExpenseInput) => api.post<Expense>('/expenses', input),
  update: (id: string, input: ExpenseInput) => api.put<Expense>(`/expenses/${id}`, input),
  remove: (id: string) => api.delete<void>(`/expenses/${id}`),
}

export const expenseKeys = {
  all: ['expenses'] as const,
  list: (filters: ExpenseFilters) => ['expenses', 'list', filters] as const,
  detail: (id: string) => ['expenses', 'detail', id] as const,
}

/** Tipos habituales en España (en puntos básicos). */
export const VAT_RATES = [
  { value: 2100, label: '21 % · general' },
  { value: 1000, label: '10 % · reducido' },
  { value: 400, label: '4 % · superreducido' },
  { value: 0, label: '0 % · exento' },
]

export const IRPF_RATES = [
  { value: 0, label: 'Sin retención' },
  { value: 700, label: '7 % · nuevos autónomos' },
  { value: 1500, label: '15 % · profesionales' },
  { value: 1900, label: '19 % · alquileres' },
]
