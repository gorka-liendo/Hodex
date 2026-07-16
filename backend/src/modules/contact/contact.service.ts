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
}
