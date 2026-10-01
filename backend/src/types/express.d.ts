import type { AuthContext } from '../modules/auth/auth.types.js'

/** Datos que los middlewares del panel dejan en `res.locals`. */
declare global {
  namespace Express {
    interface Locals {
      /** IP real del cliente (la fija `adminGateway`). */
      clientIp?: string
      /** Sesión autenticada (la fija `requireAuth`). */
      auth?: AuthContext
    }
  }
}

export {}
