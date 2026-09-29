/** Sesión autenticada disponible en `res.locals.auth` tras `requireAuth`. */
export interface AuthContext {
  sessionId: string
  userId: string
  email: string
  createdAt: Date
  expiresAt: Date
  reauthenticatedAt: Date
}
