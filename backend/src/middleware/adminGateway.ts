import { isIP } from 'node:net'
import type { NextFunction, Request, Response } from 'express'
import { env, isAdminConfigured } from '../config/env.js'
import { safeEqual } from '../lib/crypto.js'
import { notFound } from './notFound.js'

/** Cabeceras que añade el nginx de admin.hodex.es al reenviar al backend. */
export const GATEWAY_SECRET_HEADER = 'x-hodex-gateway'
export const GATEWAY_CLIENT_IP_HEADER = 'x-hodex-client-ip'

/**
 * Puerta de entrada a /api/admin. Solo deja pasar peticiones que llegan por el
 * gateway del panel (nginx en la red privada de Railway), identificado por un
 * secreto compartido. Cualquier otra cosa —incluido el dominio público
 * api.hodex.es— recibe un 404 idéntico al de una ruta inexistente.
 *
 * Como el gateway es de confianza, también fija la IP real del cliente.
 */
export function adminGateway(req: Request, res: Response, next: NextFunction): void {
  if (!isAdminConfigured) return notFound(req, res)

  const secret = env.ADMIN_GATEWAY_SECRET
  if (secret) {
    const provided = req.get(GATEWAY_SECRET_HEADER)
    if (!provided || !safeEqual(provided, secret)) return notFound(req, res)

    const clientIp = req.get(GATEWAY_CLIENT_IP_HEADER)?.trim()
    if (clientIp && isIP(clientIp)) res.locals.clientIp = clientIp
  }

  next()
}
