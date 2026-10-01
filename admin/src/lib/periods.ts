/**
 * Periodos contables habituales, calculados en hora de Madrid (el "mes actual"
 * no debe depender de la zona horaria del navegador).
 */
export type PeriodKey = 'month' | 'quarter' | 'prev-quarter' | 'year' | 'all'

export const PERIOD_OPTIONS: Array<{ value: PeriodKey; label: string }> = [
  { value: 'month', label: 'Este mes' },
  { value: 'quarter', label: 'Este trimestre' },
  { value: 'prev-quarter', label: 'Trimestre anterior' },
  { value: 'year', label: 'Este año' },
  { value: 'all', label: 'Todo' },
]

/** Fecha de hoy en Madrid como `AAAA-MM-DD`. */
export function todayInSpain(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(now)
}

const pad = (n: number) => String(n).padStart(2, '0')
const lastDay = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate()

function quarterRange(year: number, quarter: number) {
  const firstMonth = (quarter - 1) * 3 + 1
  const endMonth = firstMonth + 2
  return {
    from: `${year}-${pad(firstMonth)}-01`,
    to: `${year}-${pad(endMonth)}-${pad(lastDay(year, endMonth))}`,
  }
}

/** Rango `{from, to}` (inclusive) del periodo, o vacío para "todo". */
export function periodRange(period: PeriodKey, now = new Date()): { from?: string; to?: string } {
  const [year, month] = todayInSpain(now).split('-').map(Number) as [number, number]
  const quarter = Math.ceil(month / 3)
  switch (period) {
    case 'month':
      return { from: `${year}-${pad(month)}-01`, to: `${year}-${pad(month)}-${pad(lastDay(year, month))}` }
    case 'quarter':
      return quarterRange(year, quarter)
    case 'prev-quarter':
      return quarter === 1 ? quarterRange(year - 1, 4) : quarterRange(year, quarter - 1)
    case 'year':
      return { from: `${year}-01-01`, to: `${year}-12-31` }
    case 'all':
      return {}
  }
}

/** "2026-07-15" → "15 jul 2026". */
export function formatShortDate(isoDate: string): string {
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${isoDate}T00:00:00Z`))
}
