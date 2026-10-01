import { useEffect, useState, type ReactNode } from 'react'
import { authApi, type SecondFactor } from '../api/auth'
import { ApiError, setUnauthenticatedListener } from '../api/client'
import { queryClient } from '../lib/queryClient'
import { AuthContext, type AuthState } from './AuthContext'

/**
 * Pregunta al servidor por la sesión y devuelve cómo debe quedar el estado.
 * Si había sesión y ya no, se marca como caducada para explicarlo en el login.
 */
async function loadSession(): Promise<(prev: AuthState) => AuthState> {
  try {
    const session = await authApi.session()
    return () => ({ status: 'authenticated', session })
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return (prev) =>
        prev.status === 'authenticated'
          ? { status: 'anonymous', reason: 'expired' }
          : { status: 'anonymous' }
    }
    return () => ({ status: 'offline' })
  }
}

/**
 * Estado de autenticación del panel. El navegador nunca maneja tokens: la
 * sesión es una cookie HttpOnly y aquí solo se refleja lo que dice el servidor.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' })

  async function refresh(): Promise<void> {
    setState(await loadSession())
  }

  async function startLogin(email: string, password: string): Promise<void> {
    await authApi.login(email, password)
  }

  async function verifyLogin(factor: SecondFactor): Promise<void> {
    await authApi.verify(factor)
    await refresh()
  }

  async function logout(): Promise<void> {
    try {
      await authApi.logout()
    } finally {
      queryClient.clear() // Ningún dato de la sesión se queda en memoria.
      setState({ status: 'anonymous', reason: 'logout' })
    }
  }

  // Comprobación inicial de la sesión.
  useEffect(() => {
    let active = true
    void loadSession().then((update) => {
      if (active) setState(update)
    })
    return () => {
      active = false
    }
  }, [])

  // Si cualquier petición detecta que la sesión caducó, volvemos al login.
  useEffect(() => {
    setUnauthenticatedListener(() => {
      queryClient.clear()
      setState((prev) =>
        prev.status === 'authenticated' ? { status: 'anonymous', reason: 'expired' } : prev,
      )
    })
    return () => setUnauthenticatedListener(null)
  }, [])

  // Al volver a la pestaña, revalidar: la sesión pudo caducar mientras tanto.
  useEffect(() => {
    if (state.status !== 'authenticated') return
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [state.status])

  return (
    <AuthContext value={{ state, startLogin, verifyLogin, logout, refresh }}>
      {children}
    </AuthContext>
  )
}
