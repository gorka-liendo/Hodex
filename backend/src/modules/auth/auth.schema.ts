import { z } from 'zod'
import { PASSWORD_MAX_LENGTH } from '../../lib/password.js'

/** Paso 1. `.strict()`: cualquier campo inesperado se rechaza. */
export const loginSchema = z
  .object({
    email: z.string().trim().toLowerCase().email().max(254),
    password: z.string().min(1).max(PASSWORD_MAX_LENGTH),
  })
  .strict()

const totpCode = z
  .object({ code: z.string().regex(/^\d{6}$/, 'El código tiene 6 dígitos') })
  .strict()

const recoveryCode = z
  .object({ recoveryCode: z.string().trim().min(12).max(20) })
  .strict()

/** Paso 2 y reautenticación: código de la app o código de recuperación. */
export const secondFactorSchema = z.union([totpCode, recoveryCode])

export type LoginInput = z.infer<typeof loginSchema>
export type SecondFactorInput = z.infer<typeof secondFactorSchema>
