import { randomUUID } from 'node:crypto'
import type { Application } from 'express'
import request from 'supertest'
import { getDb } from '../db/client.js'
import { sha256Hex } from '../lib/crypto.js'
import { generateTotpSecret } from '../lib/totp.js'
import { createAdminUser } from '../modules/auth/adminUsers.service.js'
import { SESSION_COOKIE } from '../modules/auth/auth.config.js'
import { createSession } from '../modules/auth/sessions.service.js'

/** Cabeceras que añaden el gateway (nginx) y el frontend del panel. */
export const PANEL_HEADERS = {
  'x-hodex-gateway': process.env.ADMIN_GATEWAY_SECRET!,
  origin: 'http://localhost:5174',
  'x-hodex-request': '1',
}

/**
 * Cliente del panel ya autenticado, para testear módulos sin repetir el login
 * (que tiene sus propios tests). Usuario real con 2FA + sesión real.
 */
export async function signedInPanel(app: Application) {
  const { id: userId } = await createAdminUser({
    email: `test-${randomUUID()}@hodex.es`,
    password: 'caballo-bateria-grapa-correcta',
    totpSecret: generateTotpSecret(),
  })
  const token = await createSession(getDb(), userId, { ip: '127.0.0.1', userAgent: 'vitest' })
  const withAuth = (req: request.Test) =>
    req.set(PANEL_HEADERS).set('Cookie', `${SESSION_COOKIE}=${token}`)

  return {
    userId,
    /** Id de la sesión en la BD (SHA-256 del token), para manipularla en tests. */
    sessionId: sha256Hex(token),
    get: (path: string) => withAuth(request(app).get(`/api/admin${path}`)),
    post: (path: string, body: object = {}) =>
      withAuth(request(app).post(`/api/admin${path}`)).send(body),
    put: (path: string, body: object) => withAuth(request(app).put(`/api/admin${path}`)).send(body),
    delete: (path: string) => withAuth(request(app).delete(`/api/admin${path}`)),
  }
}
