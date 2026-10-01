import { use } from 'react'
import { AuthContext, type AuthContextValue } from './AuthContext'

export function useAuth(): AuthContextValue {
  const context = use(AuthContext)
  if (!context) throw new Error('useAuth() debe usarse dentro de <AuthProvider>')
  return context
}

/** Sesión actual. Solo en pantallas protegidas por <RequireAuth>. */
export function useSession() {
  const { state } = useAuth()
  if (state.status !== 'authenticated') {
    throw new Error('useSession() usado fuera de una ruta autenticada')
  }
  return state.session
}
