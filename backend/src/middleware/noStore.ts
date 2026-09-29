import type { NextFunction, Request, Response } from 'express'

/** Datos privados: que ningún navegador ni proxy guarde copia de las respuestas. */
export function noStore(_req: Request, res: Response, next: NextFunction): void {
  res.set('Cache-Control', 'no-store')
  res.set('Pragma', 'no-cache')
  next()
}
