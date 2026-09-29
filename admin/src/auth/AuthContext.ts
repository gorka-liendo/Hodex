import { createContext } from 'react'
import type { SecondFactor, SessionInfo } from '../api/auth'

export type AuthState =
  | { status: 'loading' }
  /** Sin sesión. `reason` permite explicar por qué se volvió al login. */
  | { status: 'anonymous'; reason?: 'expired' | 'logout' }
  | { status: 'authenticated'; session: SessionInfo }
  /** No se pudo contactar con el servidor al comprobar la sesión. */
  | { status: 'offline' }

export interface AuthContextValue {
  state: AuthState
  /** Paso 1: email + contraseña. Si es correcto, toca pedir el código. */
  startLogin: (email: string, password: string) => Promise<void>
  /** Paso 2: código 2FA o de recuperación → sesión iniciada. */
  verifyLogin: (factor: SecondFactor) => Promise<void>
  logout: () => Promise<void>
  /** Vuelve a leer la sesión del servidor. */
  refresh: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
