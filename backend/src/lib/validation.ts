import { z } from 'zod'
import { AppError } from './AppError.js'

/**
 * Texto opcional de formulario: recorta espacios y convierte "" en null (en la
 * BD "vacío" siempre es NULL, nunca cadena vacía).
 */
export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres`)
    .nullish()
    .transform((value) => (value ? value : null))

/** Email opcional con el mismo criterio que `optionalText`. */
export const optionalEmail = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .nullish()
  .transform((value) => (value ? value : null))
  .refine((value) => value === null || z.string().email().safeParse(value).success, {
    message: 'Email no válido',
  })

/** Número de página y tamaño, con límites para no permitir consultas enormes. */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
})

/**
 * Valida un `:id` de la URL. Un id con formato inválido es simplemente un
 * recurso que no existe: 404, no 400.
 */
export function parseIdParam(value: unknown): string {
  const parsed = z.string().uuid().safeParse(value)
  if (!parsed.success) throw new AppError(404, 'Recurso no encontrado.', { code: 'NotFound' })
  return parsed.data
}

/** Escapa `%`, `_` y `\` para usar texto del usuario en un patrón ILIKE. */
export function likePattern(term: string): string {
  return `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`
}
