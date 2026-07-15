/**
 * Error de aplicación con código HTTP. Permite lanzar errores controlados desde
 * cualquier capa y que el middleware central los traduzca a una respuesta limpia.
 */
export class AppError extends Error {
  readonly statusCode: number
  readonly details?: unknown

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message)
    this.name = 'AppError'
    this.statusCode = statusCode
    this.details = details
    Error.captureStackTrace?.(this, this.constructor)
  }
}
