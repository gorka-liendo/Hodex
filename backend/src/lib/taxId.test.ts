import { describe, expect, it } from 'vitest'
import { normalizeTaxId, validateSpanishTaxId } from './taxId.js'

describe('validateSpanishTaxId', () => {
  it.each([
    ['12345678Z', 'dni'],
    ['00000000T', 'dni'],
    ['X1234567L', 'nie'],
    ['Y1234567X', 'nie'],
    ['Z1234567R', 'nie'],
    ['K1234567L', 'nif_especial'],
    ['B12345674', 'cif'], // sociedad limitada: control numérico
    ['A58818501', 'cif'],
    ['P1234567D', 'cif'], // entidad pública: control letra
    ['G12345674', 'cif'], // asociación: admite dígito…
    ['G1234567D', 'cif'], // …o letra
  ])('acepta %s (%s)', (value, kind) => {
    expect(validateSpanishTaxId(value)).toEqual({ valid: true, normalized: value, kind })
  })

  it.each([
    '12345678A', // letra de DNI incorrecta
    'X1234567A', // letra de NIE incorrecta
    'B12345675', // control de CIF incorrecto
    'B1234567D', // SL con control letra
    'P12345674', // entidad pública con control dígito
    '1234567Z', // longitud
    'I12345674', // letra de entidad inexistente
    '',
    'HOLA',
  ])('rechaza %s', (value) => {
    expect(validateSpanishTaxId(value).valid).toBe(false)
  })

  it('normaliza separadores, minúsculas y prefijo ES intracomunitario', () => {
    expect(validateSpanishTaxId(' b-12.345.674 ')).toMatchObject({ valid: true, normalized: 'B12345674' })
    expect(validateSpanishTaxId('ESB12345674')).toMatchObject({ valid: true, normalized: 'B12345674' })
    expect(validateSpanishTaxId('es 12345678z')).toMatchObject({ valid: true, normalized: '12345678Z' })
  })

  it('normalizeTaxId no toca el contenido', () => {
    expect(normalizeTaxId('fr 123-456.789')).toBe('FR123456789')
  })
})
