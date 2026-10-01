import { api } from './client'

export interface CompanySettings {
  legalName: string | null
  tradeName: string | null
  taxId: string | null
  addressLine: string | null
  postalCode: string | null
  city: string | null
  province: string | null
  country: string
  email: string | null
  phone: string | null
  iban: string | null
  paymentTermDays: number
  invoiceFooter: string | null
  /** Datos que faltan para poder emitir facturas (vacío = listo). */
  missingForInvoicing: string[]
}

export type CompanySettingsInput = Omit<CompanySettings, 'missingForInvoicing'>

export const settingsApi = {
  company: () => api.get<CompanySettings>('/settings/company'),
  updateCompany: (input: CompanySettingsInput) => api.put<CompanySettings>('/settings/company', input),
}

export const settingsKeys = {
  company: ['settings', 'company'] as const,
}
