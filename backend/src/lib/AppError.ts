export interface AppErrorOptions {
  /** Identificador estable para el cliente (p. ej. `InvalidCredentials`). */
  code?: string
  /** Información adicional segura de exponer. */
  details?: unknown
}

/**
 * Error de aplicación con código HTTP. Permite lanzar errores controlados desde
 * cualquier capa y que el middleware central los traduzca a una respuesta limpia.
 */
export class AppError extends Error {
  readonly statusCode: number
  readonly code: string
  readonly details?: unknown

  constructor(statusCode: number, message: string, options: AppErrorOptions = {}) {
    super(message)
    this.name = 'AppError'
    this.statusCode = statusCode
    this.code = options.code ?? 'AppError'
    this.details = options.details
    Error.captureStackTrace?.(this, this.constructor)
  }
}
