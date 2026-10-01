import { createHmac, timingSafeEqual } from 'node:crypto'

/** Margen para la marca de tiempo: evita reutilizar un webhook capturado. */
const TOLERANCE_SECONDS = 5 * 60

/**
 * Verifica un webhook firmado al estilo Svix (el que usa Resend):
 * HMAC-SHA256 en base64 de `${id}.${timestamp}.${cuerpo}` con el secreto
 * (base64 tras el prefijo `whsec_`). La cabecera de firma puede traer varias
 * (`v1,xxx v1,yyy`) durante una rotación de secretos.
 */
export function verifySvixSignature(
  secret: string,
  headers: { id?: string; timestamp?: string; signature?: string },
  rawBody: Buffer,
  now = Date.now(),
): boolean {
  const { id, timestamp, signature } = headers
  if (!id || !timestamp || !signature || !/^\d+$/.test(timestamp)) return false
  if (Math.abs(now / 1000 - Number(timestamp)) > TOLERANCE_SECONDS) return false

  const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64')
  const expected = createHmac('sha256', key)
    .update(`${id}.${timestamp}.`)
    .update(rawBody)
    .digest()

  return signature.split(' ').some((part) => {
    const [version, value] = part.split(',')
    if (version !== 'v1' || !value) return false
    const given = Buffer.from(value, 'base64')
    return given.length === expected.length && timingSafeEqual(given, expected)
  })
}
