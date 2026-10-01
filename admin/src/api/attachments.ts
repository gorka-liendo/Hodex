import { api } from './client'
import type { ExpenseCategory } from './expenses'

export interface Attachment {
  id: string
  expenseId: string | null
  filename: string
  contentType: 'application/pdf' | 'image/jpeg' | 'image/png' | 'image/webp'
  sizeBytes: number
  createdAt: string
}

/** Propuesta de la lectura con IA. Todo es opcional: se revisa antes de guardar. */
export interface ExpenseSuggestion {
  issueDate: string | null
  invoiceNumber: string | null
  description: string | null
  category: ExpenseCategory | null
  supplier: { name: string | null; taxId: string | null } | null
  supplierId: string | null
  supplierMatch: { id: string; legalName: string; isSupplier: boolean } | null
  totalCents: number | null
  vatRateBp: number | null
  irpfRateBp: number | null
  warnings: string[]
}

export const ACCEPTED_FILES = 'application/pdf,image/jpeg,image/png,image/webp'
export const MAX_FILE_BYTES = 10 * 1024 * 1024

export const attachmentsApi = {
  upload: (file: File) => api.upload<Attachment>('/attachments', file),
  extract: (id: string, force = false) =>
    api.post<ExpenseSuggestion>(`/attachments/${id}/extract${force ? '?force=true' : ''}`),
  remove: (id: string) => api.delete<void>(`/attachments/${id}`),
  /** URL para verlo en el navegador (misma sesión, mismo origen). */
  fileUrl: (id: string) => `/api/admin/attachments/${id}/file`,
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`
}
