import { describe, expect, it } from 'vitest'
import { whatsappNumber, whatsappUrl } from './phone'

describe('whatsappNumber', () => {
  it.each([
    ['600 000 000', '34600000000'],
    ['+34 600 000 000', '34600000000'],
    ['0034 600-000-000', '34600000000'],
    ['944 123 456', '34944123456'],
    ['+33 6 12 34 56 78', '33612345678'],
  ])('%s → %s', (input, expected) => expect(whatsappNumber(input)).toBe(expected))

  it.each([null, '', '123', 'llámame'])('%s → null', (input) => expect(whatsappNumber(input)).toBeNull())
})

describe('whatsappUrl', () => {
  it('codifica el mensaje y omite el número si no lo hay', () => {
    expect(whatsappUrl('Factura F-1 & más', null)).toBe('https://wa.me/?text=Factura%20F-1%20%26%20m%C3%A1s')
    expect(whatsappUrl('Hola', '600000000')).toBe('https://wa.me/34600000000?text=Hola')
  })
})
