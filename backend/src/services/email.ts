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
export async function sendEmail(message: EmailMessage): Promise<void> {
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
