/**
 * Cliente HTTP del panel. Todas las llamadas van a /api/admin (mismo origen):
 * - `credentials: 'same-origin'`: la cookie de sesión viaja sola; el frontend
 *   nunca ve ni guarda el token (es HttpOnly).
 * - `X-Hodex-Request: 1`: cabecera anti-CSRF que exige el backend.
 * - `cache: 'no-store'`: nada de datos privados en la caché del navegador.
 */

/** Error de validación asociado a un campo (`path[0]` = nombre del campo). */
export interface FieldIssue {
  path: Array<string | number>
  message: string
}

/** Error de la API con el código estable que envía el backend (`error`). */
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly issues: FieldIssue[]

  constructor(status: number, code: string, message: string, issues: FieldIssue[] = []) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.issues = issues
  }

  /** Errores por campo: `{ taxId: 'NIF no válido', … }` (el primero de cada uno). */
  get fieldErrors(): Record<string, string> {
    const errors: Record<string, string> = {}
    for (const issue of this.issues) {
      const field = issue.path[0]
      if (field !== undefined && !(String(field) in errors)) errors[String(field)] = issue.message
    }
    return errors
  }
}

type UnauthenticatedListener = () => void
let onUnauthenticated: UnauthenticatedListener | null = null

/** El AuthProvider se registra aquí para enterarse si la sesión caduca. */
export function setUnauthenticatedListener(listener: UnauthenticatedListener | null): void {
  onUnauthenticated = listener
}

type Method = 'GET' | 'POST' | 'PUT'
export type QueryParams = Record<string, string | number | undefined | null>

function buildUrl(path: string, params?: QueryParams): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value))
  }
  const query = search.toString()
  return `/api/admin${path}${query ? `?${query}` : ''}`
}

function isFieldIssueList(value: unknown): value is FieldIssue[] {
  return Array.isArray(value) && value.every((i) => i && Array.isArray(i.path) && typeof i.message === 'string')
}

async function request<T>(method: Method, url: string, body?: unknown): Promise<T> {
  let response: Response
  try {
    response = await fetch(url, {
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
    const payload = (data ?? {}) as {
      error?: string
      message?: string
      issues?: unknown
      details?: unknown
    }
    const issues = isFieldIssueList(payload.issues)
      ? payload.issues
      : isFieldIssueList(payload.details)
        ? payload.details
        : []
    const error = new ApiError(
      response.status,
      payload.error ?? 'UnknownError',
      payload.message ??
        (issues.length > 0 ? 'Revisa los campos marcados.' : 'Algo salió mal. Inténtalo de nuevo.'),
      issues,
    )
    if (error.code === 'Unauthenticated') onUnauthenticated?.()
    throw error
  }
  return data as T
}

export const api = {
  get: <T>(path: string, params?: QueryParams) => request<T>('GET', buildUrl(path, params)),
  post: <T>(path: string, body: unknown = {}) => request<T>('POST', buildUrl(path), body),
  put: <T>(path: string, body: unknown) => request<T>('PUT', buildUrl(path), body),
}

/** Respuesta paginada estándar de la API. */
export interface Page<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}
