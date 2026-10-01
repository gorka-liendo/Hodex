/**
 * Formatos en español para documentos generados en el servidor (PDF, emails).
 * Mismo criterio que el panel.
 */
const euros = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 })
const decimals = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 3 })

/** 123456 → "1234,56 €". `|| 0` evita el "-0,00 €". */
export const formatEuros = (cents: number) => euros.format((cents || 0) / 100)

/** 2100 → "21 %". */
export const formatRate = (bp: number) => `${decimals.format(bp / 100)} %`

/** 1500 milésimas → "1,5". */
export const formatQuantity = (milli: number) => decimals.format(milli / 1_000)

/** "2026-09-30" → "30/09/2026" (formato habitual en facturas). */
export const formatDate = (isoDate: string) => isoDate.split('-').reverse().join('/')

const regions = new Intl.DisplayNames(['es'], { type: 'region' })

/** "FR" → "Francia". */
export const formatCountry = (code: string) => regions.of(code) ?? code
