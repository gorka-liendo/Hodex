import { QueryClient } from '@tanstack/react-query'
import { ApiError } from '../api/client'

/**
 * Caché de datos del panel. Reintenta solo fallos transitorios (red, 5xx):
 * un 4xx (no encontrado, sin sesión, validación) no mejora reintentando.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) =>
        failureCount < 2 && !(error instanceof ApiError && error.status >= 400 && error.status < 500),
    },
    mutations: { retry: false },
  },
})
