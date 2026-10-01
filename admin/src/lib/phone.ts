/**
 * Número para enlaces de WhatsApp (wa.me): solo dígitos y con prefijo de país.
 * Un móvil/fijo español de 9 cifras sin prefijo se asume +34.
 * Devuelve null si no parece un teléfono.
 */
export function whatsappNumber(raw: string | null | undefined): string | null {
  if (!raw) return null
  let digits = raw.replace(/[^\d+]/g, '')
  if (digits.startsWith('+')) digits = digits.slice(1)
  else if (digits.startsWith('00')) digits = digits.slice(2)
  else if (/^[6-9]\d{8}$/.test(digits)) digits = `34${digits}`
  digits = digits.replace(/\D/g, '')
  return /^\d{8,15}$/.test(digits) ? digits : null
}

/** Enlace que abre WhatsApp con el mensaje escrito (y el contacto, si se conoce). */
export function whatsappUrl(text: string, phone: string | null): string {
  const number = whatsappNumber(phone)
  return `https://wa.me/${number ?? ''}?text=${encodeURIComponent(text)}`
}
