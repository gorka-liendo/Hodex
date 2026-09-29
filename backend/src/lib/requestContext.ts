import type { Request, Response } from 'express'

/** Datos del cliente que acompañan a auditoría, sesiones y avisos. */
export interface RequestContext {
  ip: string | null
  userAgent: string | null
}

/**
 * IP y user-agent del cliente. La IP la fija el middleware del gateway del
 * panel (que sabe cuál es la real detrás de los proxies); si no, la de Express.
 */
export function getRequestContext(req: Request, res: Response): RequestContext {
  return {
    ip: res.locals.clientIp ?? req.ip ?? null,
    userAgent: req.get('user-agent')?.slice(0, 512) ?? null,
  }
}
