import type { Attachment, ExpenseSuggestion } from './attachments'
import { api } from './client'

export type InboundStatus = 'received' | 'processed' | 'blocked' | 'failed' | 'dismissed'

export interface InboxItem {
  id: string
  from: string
  subject: string | null
  receivedAt: string
  status: InboundStatus
  note: string | null
  pending: Array<
    Pick<Attachment, 'id' | 'filename' | 'contentType' | 'sizeBytes'> & {
      /** Lectura de la IA, si la hay (sin los campos que añade el panel al cotejar proveedores). */
      suggestion: Omit<ExpenseSuggestion, 'supplierId' | 'supplierMatch'> | null
    }
  >
}

export interface Inbox {
  enabled: boolean
  address: string | null
  pendingCount: number
  items: InboxItem[]
}

export const inboxApi = {
  list: () => api.get<Inbox>('/inbox'),
  count: () => api.get<{ pendingCount: number }>('/inbox/count'),
  accept: (id: string) => api.post<void>(`/inbox/${id}/accept`),
  dismiss: (id: string) => api.post<void>(`/inbox/${id}/dismiss`),
}

export const inboxKeys = {
  all: ['inbox'] as const,
  list: ['inbox', 'list'] as const,
  count: ['inbox', 'count'] as const,
}
