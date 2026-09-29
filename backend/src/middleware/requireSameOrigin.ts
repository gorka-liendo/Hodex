import type { NextFunction, Request, Response } from 'express'
import { env } from '../config/env.js'
import { AppError } from '../lib/AppError.js'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

/** Cabecera que el frontend del panel añade a todas sus peticiones. */
export const REQUEST_MARKER_HEADER = 'x-hodex-request'

/**
 * Protección CSRF (además de la cookie SameSite=Strict). Toda petición que
 * modifique datos debe:
 *  1. traer `Origin` exactamente igual al del panel, y
 *  2. traer la cabecera `X-Hodex-Request: 1`, que un formulario o enlace de
 *     otra web no puede añadir sin pasar por CORS (y CORS no lo permite).
 */
export function requireSameOrigin(req: Request, _res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method)) return next()

  const originOk = req.get('origin') === env.ADMIN_ORIGIN
  const markerOk = req.get(REQUEST_MARKER_HEADER) === '1'
  if (!originOk || !markerOk) {
    throw new AppError(403, 'Origen de la petición no permitido.', { code: 'Forbidden' })
  }
  next()
}
