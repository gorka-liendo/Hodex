/**
 * ¿Es una violación de UNIQUE de Postgres (código 23505) sobre `constraint`?
 * Drizzle envuelve el error del driver en `cause`, así que se miran ambos.
 */
export function isUniqueViolation(error: unknown, constraint: string): boolean {
  for (let current = error; current && typeof current === 'object'; ) {
    const { code, constraint: name, cause } = current as {
      code?: string
      constraint?: string
      cause?: unknown
    }
    if (code === '23505' && name === constraint) return true
    current = cause
  }
  return false
}
