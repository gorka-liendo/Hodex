import nodemailer, { type Transporter } from 'nodemailer'
import { env, isEmailConfigured } from '../config/env.js'
import { logger } from '../lib/logger.js'

let transporter: Transporter | null = null

/** Crea (una sola vez) el transporte SMTP si hay configuración. */
function getTransporter(): Transporter | null {
  if (!isEmailConfigured) return null
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth:
        env.SMTP_USER && env.SMTP_PASS
          ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
          : undefined,
    })
  }
  return transporter
}

export interface EmailAttachment {
  filename: string
  content: Buffer
}

export interface EmailMessage {
  subject: string
  text: string
  /** Versión HTML opcional (los clientes que no la muestren usan `text`). */
  html?: string
  replyTo?: string
  /** Destinatario. Por defecto, CONTACT_TO (buzón interno del equipo). */
  to?: string
  cc?: string[]
  /** Remitente. Por defecto, CONTACT_FROM. */
  from?: string
  attachments?: EmailAttachment[]
}

export interface EmailResult {
  /** Id del mensaje en el proveedor (Resend), si lo hay. */
  id: string | null
}

/**
 * Envía un email. Si no hay SMTP configurado, lo registra en consola en vez de
 * fallar — así el backend funciona en local sin secretos y es production-ready
 * en cuanto se rellenan las variables de entorno.
 */
/**
 * API key de Resend: explícita (RESEND_API_KEY) o derivada de la config SMTP —
 * en Resend la contraseña SMTP ES la API key, así que si el host es
 * smtp.resend.com podemos reutilizarla para la vía HTTP.
 */
export function getResendKey(): string | undefined {
  if (env.RESEND_API_KEY) return env.RESEND_API_KEY
  if (env.SMTP_HOST === 'smtp.resend.com') return env.SMTP_PASS
  return undefined
}

export async function sendEmail(message: EmailMessage): Promise<EmailResult> {
  const to = message.to ?? env.CONTACT_TO
  const from = message.from ?? env.CONTACT_FROM ?? env.CONTACT_TO

  // Vía preferente: API HTTP de Resend (443). Los puertos SMTP salientes están
  // bloqueados en muchos PaaS (Railway incluido), así que SMTP solo es fallback.
  const resendKey = getResendKey()
  if (resendKey && to) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        ...(message.cc?.length ? { cc: message.cc } : {}),
        subject: message.subject,
        text: message.text,
        ...(message.html ? { html: message.html } : {}),
        ...(message.replyTo ? { reply_to: message.replyTo } : {}),
        ...(message.attachments?.length
          ? {
              attachments: message.attachments.map((a) => ({
                filename: a.filename,
                content: a.content.toString('base64'),
              })),
            }
          : {}),
      }),
      signal: AbortSignal.timeout(30_000),
    })
    if (!res.ok) {
      throw new Error(`Resend API ${res.status}: ${await res.text()}`)
    }
    const body = (await res.json().catch(() => ({}))) as { id?: string }
    return { id: body.id ?? null }
  }

  const tx = getTransporter()

  if (!tx) {
    logger.warn(
      { subject: message.subject },
      'Email no configurado — el mensaje se registra en consola en lugar de enviarse',
    )
    // Los adjuntos se resumen (nombre y tamaño): nunca se vuelca su contenido al log.
    const { attachments, ...rest } = message
    logger.info(
      { email: { ...rest, to, attachments: attachments?.map((a) => ({ filename: a.filename, bytes: a.content.length })) } },
      'Contenido del email (modo consola)',
    )
    return { id: null }
  }

  const info = await tx.sendMail({
    from,
    to,
    ...(message.cc?.length ? { cc: message.cc } : {}),
    subject: message.subject,
    text: message.text,
    ...(message.html ? { html: message.html } : {}),
    ...(message.replyTo ? { replyTo: message.replyTo } : {}),
    ...(message.attachments?.length ? { attachments: message.attachments } : {}),
  })
  return { id: info.messageId ?? null }
}
