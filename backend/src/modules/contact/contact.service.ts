import { env } from '../../config/env.js'
import { logger } from '../../lib/logger.js'
import { sendEmail } from '../../services/email.js'
import type { ContactInput } from './contact.schema.js'

/** Etiquetas legibles para cada tipo de intención. */
const INTENT_LABELS: Record<ContactInput['intent'], string> = {
  empresa: 'Empresa — quiere un producto digital',
  automatizar: 'Automatización con IA',
  creador: 'Quiere ser creador de Hodex',
  otro: 'Otro',
}

/**
 * Procesa una solicitud de contacto: la registra y dispara la notificación por
 * email. Aquí se añadiría persistencia en BD, CRM, etc. a medida que crezca.
 */
export async function submitContact(input: ContactInput): Promise<void> {
  const label = INTENT_LABELS[input.intent]

  logger.info(
    { intent: input.intent, email: input.email },
    'Nueva solicitud de contacto',
  )

  await sendEmail({
    subject: `[Hodex] Nuevo contacto — ${label}`,
    replyTo: input.email,
    text: [
      `Intención: ${label}`,
      `Nombre:    ${input.name}`,
      `Email:     ${input.email}`,
      input.company ? `Empresa:   ${input.company}` : null,
      `Consentimiento: aceptado (política de privacidad) — ${new Date().toISOString()}`,
      '',
      input.message,
    ]
      .filter((line) => line !== null)
      .join('\n'),
  })

  // Confirmación al remitente. Si falla, no tumbamos la petición: su mensaje
  // ya está en nuestro buzón, que es lo importante.
  try {
    await sendEmail({
      to: input.email,
      // Las respuestas del cliente van al buzón del equipo, no al remitente técnico.
      replyTo: env.CONTACT_TO,
      subject: 'Hemos recibido tu mensaje — Hodex',
      text: [
        `Hola ${input.name},`,
        '',
        'Gracias por escribirnos. Hemos recibido tu mensaje y te responderemos',
        'en un plazo máximo de 24–48 horas laborables.',
        '',
        'Copia de tu mensaje:',
        `«${input.message}»`,
        '',
        'Si quieres añadir algo mientras tanto, responde directamente a este email.',
        '',
        '— El equipo de Hodex',
        'https://www.hodex.es',
      ].join('\n'),
    })
  } catch (err) {
    logger.warn({ err, email: input.email }, 'No se pudo enviar la confirmación al remitente')
  }
}
