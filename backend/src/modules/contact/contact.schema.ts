import { z } from 'zod'

/** Validación del cuerpo del formulario de contacto. */
export const contactSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(120),
  email: z.string().trim().email('Email no válido').max(200),
  company: z.string().trim().max(160).optional(),
  message: z.string().trim().min(1, 'El mensaje es obligatorio').max(4000),
  intent: z.enum(['empresa', 'automatizar', 'creador', 'otro']),
  // Consentimiento RGPD: debe ser true (casilla marcada). Se registra en el
  // email de notificación como prueba (responsabilidad proactiva, art. 5.2).
  consent: z.literal(true, {
    errorMap: () => ({ message: 'Debes aceptar la política de privacidad' }),
  }),
})

export type ContactInput = z.infer<typeof contactSchema>
