import { api, type Page } from './client'

export type InvoiceStatus = 'draft' | 'issued'
export type InvoiceKind = 'standard' | 'rectifying'

export interface PartySnapshot {
  legalName: string
  tradeName: string | null
  taxId: string | null
  addressLine: string | null
  postalCode: string | null
  city: string | null
  province: string | null
  country: string
  email: string | null
  phone?: string | null
  iban?: string | null
}

export interface InvoiceLine {
  id: string
  position: number
  description: string
  quantityMilli: number
  unitPriceCents: number
  vatRateBp: number
  baseCents: number
}

export interface Invoice {
  id: string
  status: InvoiceStatus
  kind: InvoiceKind
  series: string | null
  number: number | null
  fullNumber: string | null
  clientId: string
  issueDate: string
  dueDate: string | null
  rectificationReason: string | null
  irpfRateBp: number
  baseCents: number
  vatCents: number
  irpfCents: number
  totalCents: number
  notes: string | null
  internalNotes: string | null
  issuerSnapshot: PartySnapshot | null
  clientSnapshot: PartySnapshot | null
  issuedAt: string | null
  hash: string | null
  previousHash: string | null
  paidOn: string | null
  createdAt: string
  updatedAt: string
  lines: InvoiceLine[]
  vatBreakdown: Array<{ rateBp: number; baseCents: number; vatCents: number }>
  client: Omit<PartySnapshot, 'iban'> & { id: string }
  rectifies: { id: string; fullNumber: string | null } | null
  rectifiedBy: Array<{ id: string; fullNumber: string | null; status: InvoiceStatus }>
}

export interface InvoiceListItem {
  id: string
  status: InvoiceStatus
  kind: InvoiceKind
  fullNumber: string | null
  issueDate: string
  dueDate: string | null
  paidOn: string | null
  baseCents: number
  totalCents: number
  clientId: string
  clientName: string
}

export interface InvoiceDraftInput {
  clientId: string
  issueDate: string
  dueDate: string | null
  irpfRateBp: number
  notes: string
  internalNotes: string
  lines: Array<{ description: string; quantityMilli: number; unitPriceCents: number; vatRateBp: number }>
}

export interface InvoiceFilters {
  q?: string
  status?: 'all' | InvoiceStatus
  payment?: 'all' | 'paid' | 'unpaid' | 'overdue'
  from?: string
  to?: string
  clientId?: string
  page?: number
  pageSize?: number
}

export interface InvoiceSums {
  baseCents: number
  vatCents: number
  totalCents: number
  outstandingCents: number
}

export const invoicesApi = {
  list: (filters: InvoiceFilters) =>
    api.get<Page<InvoiceListItem> & { sums: InvoiceSums }>('/invoices', { ...filters }),
  get: (id: string) => api.get<Invoice>(`/invoices/${id}`),
  create: (input: InvoiceDraftInput) => api.post<Invoice>('/invoices', input),
  update: (id: string, input: InvoiceDraftInput) => api.put<Invoice>(`/invoices/${id}`, input),
  remove: (id: string) => api.delete<void>(`/invoices/${id}`),
  issue: (id: string) => api.post<Invoice>(`/invoices/${id}/issue`),
  setPayment: (id: string, paidOn: string | null) => api.post<Invoice>(`/invoices/${id}/payment`, { paidOn }),
  rectify: (id: string, reason: string) => api.post<Invoice>(`/invoices/${id}/rectify`, { reason }),
}

/** Bajo `invoices`; el resumen también se invalida porque depende de ellas. */
export const invoiceKeys = {
  all: ['invoices'] as const,
  list: (filters: InvoiceFilters) => ['invoices', 'list', filters] as const,
  detail: (id: string) => ['invoices', 'detail', id] as const,
}

/** Estado legible de una factura en un momento dado. */
export function invoiceState(
  invoice: Pick<InvoiceListItem, 'status' | 'paidOn' | 'dueDate'>,
  today: string,
): 'Borrador' | 'Cobrada' | 'Vencida' | 'Pendiente' {
  if (invoice.status === 'draft') return 'Borrador'
  if (invoice.paidOn) return 'Cobrada'
  if (invoice.dueDate && invoice.dueDate < today) return 'Vencida'
  return 'Pendiente'
}
