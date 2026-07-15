import type { Request, Response } from 'express'
import { contactSchema } from './contact.schema.js'
import { submitContact } from './contact.service.js'

/**
 * POST /api/contact — recibe y procesa el formulario. La validación lanza
 * ZodError si el cuerpo es inválido; Express 5 reenvía el rechazo de la promesa
 * al errorHandler automáticamente.
 */
export async function createContact(req: Request, res: Response): Promise<void> {
  const data = contactSchema.parse(req.body)
  await submitContact(data)
  res.status(201).json({
    ok: true,
    message: 'Mensaje recibido. Te responderemos en breve.',
  })
}
