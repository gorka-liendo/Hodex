import { describe, expect, it } from 'vitest'
import { formatIban, isValidIban } from './iban.js'

describe('isValidIban', () => {
  it.each([
    'ES9121000418450200051332',
    'es91 2100 0418 4502 0005 1332',
    'DE89370400440532013000',
    'GB29NWBK60161331926819',
  ])('acepta %s', (iban) => expect(isValidIban(iban)).toBe(true))

  it.each([
    'ES9121000418450200051333', // control incorrecto
    'ES912100041845020005133', // longitud española incorrecta
    'XX00',
    'hola',
  ])('rechaza %s', (iban) => expect(isValidIban(iban)).toBe(false))
})

it('formatea en grupos de 4', () => {
  expect(formatIban('es9121000418450200051332')).toBe('ES91 2100 0418 4502 0005 1332')
})
