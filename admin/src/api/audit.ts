import { api, type Page } from './client'

export type AuditGroup = 'all' | 'access' | 'invoices' | 'expenses' | 'ai' | 'contacts' | 'settings'

export interface AuditEntry {
  id: number
  occurredAt: string
  action: string
  outcome: 'success' | 'failure'
  ipAddress: string | null
  userAgent: string | null
  metadata: Record<string, unknown> | null
}

export interface AuditFilters {
  group: AuditGroup
  outcome: 'all' | 'success' | 'failure'
  page: number
}

export interface AuditPage extends Page<AuditEntry> {
  aiUsage: { month: string; readings: number; inputTokens: number; outputTokens: number }
  failedLogins24h: number
}

export const auditApi = {
  list: (filters: AuditFilters) => api.get<AuditPage>('/audit', { ...filters, pageSize: 50 }),
}

export const auditKeys = {
  all: ['audit'] as const,
  list: (filters: AuditFilters) => ['audit', filters] as const,
}
