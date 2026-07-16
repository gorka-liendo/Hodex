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

export interface EmailMessage {
  subject: string
  text: string
  replyTo?: string
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
function getResendKey(): string | undefined {
  if (env.RESEND_API_KEY) return env.RESEND_API_KEY
  if (env.SMTP_HOST === 'smtp.resend.com') return env.SMTP_PASS
  return undefined
}

export async function sendEmail(message: EmailMessage): Promise<void> {
  // Vía preferente: API HTTP de Resend (443). Los puertos SMTP salientes están
  // bloqueados en muchos PaaS (Railway incluido), así que SMTP solo es fallback.
  const resendKey = getResendKey()
  if (resendKey && env.CONTACT_TO) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.CONTACT_FROM ?? env.CONTACT_TO,
        to: [env.CONTACT_TO],
        subject: message.subject,
        text: message.text,
        ...(message.replyTo ? { reply_to: message.replyTo } : {}),
      }),
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) {
      throw new Error(`Resend API ${res.status}: ${await res.text()}`)
    }
    return
  }

  const tx = getTransporter()

  if (!tx) {
    logger.warn(
      { subject: message.subject },
      'Email no configurado — el mensaje se registra en consola en lugar de enviarse',
    )
    logger.info({ email: message }, 'Contenido del email (modo consola)')
    return
  }

  await tx.sendMail({
    from: env.CONTACT_FROM ?? env.CONTACT_TO,
    to: env.CONTACT_TO,
    subject: message.subject,
    text: message.text,
    ...(message.replyTo ? { replyTo: message.replyTo } : {}),
  })
}
