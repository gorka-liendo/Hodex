import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'
import { AppError } from '../lib/AppError.js'
import { logger } from '../lib/logger.js'

/**
 * Manejo de errores centralizado. Traduce cada tipo de error a una respuesta
 * JSON consistente. Debe registrarse el último, con sus 4 argumentos, para que
 * Express lo reconozca como error handler.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Errores de validación → 400 con el detalle de los campos.
  if (err instanceof ZodError) {
    res.status(400).json({ error: 'ValidationError', issues: err.issues })
    return
  }

  // Errores controlados de la aplicación.
  if (err instanceof AppError) {
    if (err.statusCode >= 500) logger.error({ err }, err.message)
    res.status(err.statusCode).json({
      error: err.name,
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
    })
    return
  }

  // Cualquier otra cosa → 500 sin filtrar detalles internos.
  logger.error({ err }, 'Error no controlado')
  res
    .status(500)
    .json({ error: 'InternalServerError', message: 'Algo salió mal.' })
}
