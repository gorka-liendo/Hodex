import type { Request, Response } from 'express'

/** Respuesta 404 uniforme para rutas no existentes. */
export function notFound(_req: Request, res: Response): void {
  res.status(404).json({ error: 'NotFound', message: 'Recurso no encontrado.' })
}
