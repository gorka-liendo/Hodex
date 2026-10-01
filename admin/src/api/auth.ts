import { api } from './client'

/** Respuesta de GET /auth/session. */
export interface SessionInfo {
  user: { email: string }
  session: {
    createdAt: string
    expiresAt: string
    idleTimeoutSeconds: number
  }
  recoveryCodesRemaining: number
}

/** Segundo factor: código de la app o código de recuperación. */
export type SecondFactor = { code: string } | { recoveryCode: string }

export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ status: 'mfa_required' }>('/auth/login', { email, password }),
  verify: (factor: SecondFactor) =>
    api.post<{ user: { email: string } }>('/auth/login/verify', factor),
  session: () => api.get<SessionInfo>('/auth/session'),
  logout: () => api.post<void>('/auth/logout'),
  reauth: (factor: SecondFactor) => api.post<void>('/auth/reauth', factor),
  logoutOthers: () => api.post<{ revoked: number }>('/auth/logout-others'),
}
