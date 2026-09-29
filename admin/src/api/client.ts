/**
 * Cliente HTTP del panel. Todas las llamadas van a /api/admin (mismo origen):
 * - `credentials: 'same-origin'`: la cookie de sesión viaja sola; el frontend
 *   nunca ve ni guarda el token (es HttpOnly).
 * - `X-Hodex-Request: 1`: cabecera anti-CSRF que exige el backend.
 * - `cache: 'no-store'`: nada de datos privados en la caché del navegador.
 */

/** Error de la API con el código estable que envía el backend (`error`). */
export class ApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

type UnauthenticatedListener = () => void
let onUnauthenticated: UnauthenticatedListener | null = null

/** El AuthProvider se registra aquí para enterarse si la sesión caduca. */
export function setUnauthenticatedListener(listener: UnauthenticatedListener | null): void {
  onUnauthenticated = listener
}

async function request<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
  let response: Response
  try {
    response = await fetch(`/api/admin${path}`, {
      method,
      credentials: 'same-origin',
      cache: 'no-store',
      headers: {
        'X-Hodex-Request': '1',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, 'NetworkError', 'No se pudo conectar. Revisa tu conexión.')
  }

  if (response.status === 204) return undefined as T

  const data: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const payload = (data ?? {}) as { error?: string; message?: string }
    const error = new ApiError(
      response.status,
      payload.error ?? 'UnknownError',
      payload.message ?? 'Algo salió mal. Inténtalo de nuevo.',
    )
    if (error.code === 'Unauthenticated') onUnauthenticated?.()
    throw error
  }
  return data as T
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body: unknown = {}) => request<T>('POST', path, body),
}
