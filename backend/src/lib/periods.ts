/**
 * Periodos contables en hora de Madrid: el "mes actual" de la empresa no debe
 * depender de la zona horaria del servidor (Railway corre en UTC).
 */

/** Fecha de hoy en Madrid como `AAAA-MM-DD`. */
export function todayInSpain(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(now)
}

const pad = (n: number) => String(n).padStart(2, '0')
const lastDay = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate()

export interface DateRange {
  from: string
  to: string
}

export function currentMonth(now = new Date()): DateRange {
  const [year, month] = todayInSpain(now).split('-').map(Number) as [number, number]
  return { from: `${year}-${pad(month)}-01`, to: `${year}-${pad(month)}-${pad(lastDay(year, month))}` }
}

export function currentQuarter(now = new Date()): DateRange & { quarter: number; year: number } {
  const [year, month] = todayInSpain(now).split('-').map(Number) as [number, number]
  const quarter = Math.ceil(month / 3)
  const first = (quarter - 1) * 3 + 1
  const last = first + 2
  return {
    quarter,
    year,
    from: `${year}-${pad(first)}-01`,
    to: `${year}-${pad(last)}-${pad(lastDay(year, last))}`,
  }
}

/** Suma días a una fecha `AAAA-MM-DD` (sin zonas horarias de por medio). */
export function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}
