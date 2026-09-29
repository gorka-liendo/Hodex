import { describe, expect, it } from 'vitest'
import { checkPasswordPolicy, hashPassword, verifyPassword } from './password.js'

describe('política de contraseñas', () => {
  const email = 'gorka@hodex.es'

  it('acepta una contraseña larga y variada', () => {
    expect(checkPasswordPolicy('caballo-bateria-grapa-correcta', email)).toEqual([])
  })

  it('rechaza contraseñas cortas', () => {
    expect(checkPasswordPolicy('Corta1!', email)).not.toEqual([])
  })

  it('rechaza contraseñas que contienen el email', () => {
    expect(checkPasswordPolicy('gorka-es-el-mejor-2026', email)).not.toEqual([])
  })

  it('rechaza contraseñas repetitivas', () => {
    expect(checkPasswordPolicy('aaaaaaaaaaaaaaaaaaaa', email)).not.toEqual([])
  })

  it('rechaza contraseñas enormes', () => {
    expect(checkPasswordPolicy('ab1!'.repeat(40), email)).not.toEqual([])
  })
})

describe('argon2id', () => {
  it('verifica la contraseña correcta y rechaza la incorrecta', async () => {
    const hash = await hashPassword('caballo-bateria-grapa-correcta')
    expect(hash.startsWith('$argon2id$')).toBe(true)
    expect(await verifyPassword(hash, 'caballo-bateria-grapa-correcta')).toBe(true)
    expect(await verifyPassword(hash, 'caballo-bateria-grapa-incorrecta')).toBe(false)
  })

  it('no lanza con un hash corrupto', async () => {
    expect(await verifyPassword('no-es-un-hash', 'x')).toBe(false)
  })
})
