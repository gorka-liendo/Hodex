import { api, type Page } from './client'

export interface Contact {
  id: string
  isClient: boolean
  isSupplier: boolean
  legalName: string
  tradeName: string | null
  taxId: string | null
  country: string
  email: string | null
  phone: string | null
  addressLine: string | null
  postalCode: string | null
  city: string | null
  province: string | null
  notes: string | null
  archivedAt: string | null
  createdAt: string
  updatedAt: string
}

/** Lo que envía el formulario (texto vacío = sin dato; el backend lo guarda como null). */
export type ContactInput = Omit<Contact, 'id' | 'archivedAt' | 'createdAt' | 'updatedAt'>

export interface ContactFilters {
  q?: string
  role?: 'all' | 'client' | 'supplier'
  status?: 'active' | 'archived'
  page?: number
  pageSize?: number
}

export const contactsApi = {
  list: (filters: ContactFilters) => api.get<Page<Contact>>('/contacts', { ...filters }),
  get: (id: string) => api.get<Contact>(`/contacts/${id}`),
  create: (input: ContactInput) => api.post<Contact>('/contacts', input),
  update: (id: string, input: ContactInput) => api.put<Contact>(`/contacts/${id}`, input),
  archive: (id: string) => api.post<Contact>(`/contacts/${id}/archive`),
  restore: (id: string) => api.post<Contact>(`/contacts/${id}/restore`),
}

/** Claves de caché de TanStack Query, centralizadas para invalidar con precisión. */
export const contactKeys = {
  all: ['contacts'] as const,
  list: (filters: ContactFilters) => ['contacts', 'list', filters] as const,
  detail: (id: string) => ['contacts', 'detail', id] as const,
}

/** "Cliente", "Proveedor" o "Cliente · Proveedor". */
export function contactRoleLabel(contact: Pick<Contact, 'isClient' | 'isSupplier'>): string {
  return [contact.isClient && 'Cliente', contact.isSupplier && 'Proveedor']
    .filter(Boolean)
    .join(' · ')
}
