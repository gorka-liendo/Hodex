import { describe, expect, it } from 'vitest'
import { detectFileType, safeFilename } from './fileType.js'

describe('detectFileType', () => {
  it.each([
    ['PDF', Buffer.from('%PDF-1.7\n…'), 'application/pdf'],
    ['JPEG', Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]), 'image/jpeg'],
    ['PNG', Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]), 'image/png'],
    ['WebP', Buffer.from('RIFF\u0000\u0000\u0000\u0000WEBPVP8 ', 'latin1'), 'image/webp'],
  ])('reconoce %s por su contenido', (_label, data, type) => {
    expect(detectFileType(data)).toBe(type)
  })

  it.each([
    ['HTML disfrazado', Buffer.from('<html><script>alert(1)</script>')],
    ['SVG', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>')],
    ['vacío', Buffer.alloc(0)],
    ['RIFF que no es WebP', Buffer.from('RIFF\u0000\u0000\u0000\u0000WAVEfmt ', 'latin1')],
  ])('rechaza %s', (_label, data) => {
    expect(detectFileType(data)).toBeNull()
  })
})

describe('safeFilename', () => {
  it('quita rutas, comillas y caracteres de control, y pone la extensión real', () => {
    expect(safeFilename(encodeURIComponent('../../etc/"ticket"\u0000.html'), 'application/pdf')).toBe('ticket.pdf')
    expect(safeFilename('C:\\fotos\\Ticket gasolinera.JPEG', 'image/jpeg')).toBe('Ticket gasolinera.jpg')
  })

  it('conserva tildes y usa un nombre por defecto si no queda nada', () => {
    expect(safeFilename(encodeURIComponent('Factura señal.pdf'), 'application/pdf')).toBe('Factura señal.pdf')
    expect(safeFilename(undefined, 'image/png')).toBe('documento.png')
    expect(safeFilename('%E0%A4%A', 'image/png')).toBe('%E0%A4%A.png')
  })
})
