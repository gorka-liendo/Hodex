/** Formatos en español y hora peninsular, sea cual sea la zona del navegador. */
const TIME_ZONE = 'Europe/Madrid'

const dateTime = new Intl.DateTimeFormat('es-ES', {
  dateStyle: 'long',
  timeStyle: 'short',
  timeZone: TIME_ZONE,
})

const longDate = new Intl.DateTimeFormat('es-ES', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: TIME_ZONE,
})

export const formatDateTime = (value: string | Date) => dateTime.format(new Date(value))
export const formatLongDate = (value: string | Date) => longDate.format(new Date(value))

/** Hora actual (0-23) en Madrid. */
export function currentHourInSpain(now = new Date()): number {
  return Number(
    new Intl.DateTimeFormat('es-ES', { hour: 'numeric', hour12: false, timeZone: TIME_ZONE }).format(now),
  )
}
