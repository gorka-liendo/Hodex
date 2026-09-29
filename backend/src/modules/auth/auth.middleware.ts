import type { NextFunction, Request, Response } from 'express'
import { parseCookie } from 'cookie'
import { AppError } from '../../lib/AppError.js'
import { AUTH_POLICY, COOKIE_OPTIONS, SESSION_COOKIE } from './auth.config.js'
import type { AuthContext } from './auth.types.js'
import { validateSession } from './sessions.service.js'

/** Lee una cookie de la petición (Express 5 no las parsea por sí mismo). */
export function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.cookie
  return header ? parseCookie(header)[name] : undefined
}

/** Sesión de la petición actual. Solo válido detrás de `requireAuth`. */
export function getAuth(res: Response): AuthContext {
  const auth = res.locals.auth
  if (!auth) throw new Error('getAuth() usado en una ruta sin requireAuth')
  return auth
}

/** Exige una sesión válida. Sin ella: 401 y se borra la cookie obsoleta. */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = readCookie(req, SESSION_COOKIE)
  const auth = token ? await validateSession(token) : null

  if (!auth) {
    if (token) res.clearCookie(SESSION_COOKIE, COOKIE_OPTIONS)
    throw new AppError(401, 'Tu sesión ha caducado. Vuelve a iniciar sesión.', {
      code: 'Unauthenticated',
    })
  }

  res.locals.auth = auth
  next()
}

/**
 * Para acciones sensibles (borrar, exportar, cambiar credenciales): exige haber
 * confirmado el 2FA hace poco. Si no, 403 `ReauthRequired` y el panel pide el
 * código antes de reintentar.
 */
export function requireRecentAuth(_req: Request, res: Response, next: NextFunction): void {
  const { reauthenticatedAt } = getAuth(res)
  if (Date.now() - reauthenticatedAt.getTime() > AUTH_POLICY.reauthMaxAgeMs) {
    throw new AppError(403, 'Confirma tu código de verificación para continuar.', {
      code: 'ReauthRequired',
    })
  }
  next()
}
