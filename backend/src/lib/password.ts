import argon2 from 'argon2'
import { randomToken } from './crypto.js'

/**
 * Contraseñas con argon2id (recomendación OWASP). 64 MiB y 3 iteraciones:
 * unos ~100-200 ms por intento en el servidor, lo que hace inviable un ataque
 * de diccionario si alguien llegara a robar los hashes.
 */
const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 64 * 1024,
  timeCost: 3,
  parallelism: 1,
} as const

export const PASSWORD_MIN_LENGTH = 14
// Tope para que nadie pueda saturar el servidor enviando contraseñas enormes.
export const PASSWORD_MAX_LENGTH = 128

/** Reglas de la contraseña. Devuelve la lista de problemas (vacía = válida). */
export function checkPasswordPolicy(password: string, email: string): string[] {
  const problems: string[] = []
  if (password.length < PASSWORD_MIN_LENGTH) {
    problems.push(`Debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`)
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    problems.push(`No puede superar ${PASSWORD_MAX_LENGTH} caracteres.`)
  }
  const localPart = email.split('@')[0]?.toLowerCase()
  if (localPart && localPart.length >= 3 && password.toLowerCase().includes(localPart)) {
    problems.push('No puede contener tu email.')
  }
  if (new Set(password).size < 6) {
    problems.push('Usa más variedad de caracteres.')
  }
  return problems
}

export function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, ARGON2_OPTIONS)
}

/** Nunca lanza: un hash corrupto cuenta como contraseña incorrecta. */
export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password)
  } catch {
    return false
  }
}

let dummyHash: Promise<string> | undefined

/**
 * Hace una verificación "de mentira" con el mismo coste que una real. Se usa
 * cuando el email no existe o la cuenta está bloqueada, para que el tiempo de
 * respuesta no revele cuál de los casos se ha dado.
 */
export async function burnPasswordCheck(password: string): Promise<void> {
  dummyHash ??= hashPassword(randomToken())
  await verifyPassword(await dummyHash, password)
}
