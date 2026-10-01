import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { FullScreenStatus } from '../components/FullScreenStatus'
import { useAuth } from './useAuth'

/** Solo con sesión. Sin ella, al login recordando adónde se quería ir. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { state, refresh } = useAuth()
  const location = useLocation()

  if (state.status === 'loading') return <FullScreenStatus message="Comprobando sesión…" />
  if (state.status === 'offline') {
    return <FullScreenStatus message="No se pudo conectar con el servidor." onRetry={refresh} />
  }
  if (state.status === 'anonymous') {
    return <Navigate to="/login" replace state={{ from: location.pathname, reason: state.reason }} />
  }
  return children
}

/** Solo sin sesión (el login). Con sesión, directo al panel. */
export function PublicOnly({ children }: { children: ReactNode }) {
  const { state } = useAuth()
  const location = useLocation()

  if (state.status === 'loading') return <FullScreenStatus message="Comprobando sesión…" />
  if (state.status === 'authenticated') {
    const from = (location.state as { from?: string } | null)?.from
    return <Navigate to={from && from !== '/login' ? from : '/'} replace />
  }
  return children
}
