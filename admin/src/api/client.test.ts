import { afterEach, describe, expect, it, vi } from 'vitest'
import { api, ApiError, setUnauthenticatedListener } from './client'

function mockFetch(response: Response) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(response)
}

afterEach(() => {
  vi.restoreAllMocks()
  setUnauthenticatedListener(null)
})

describe('api.download', () => {
  it('devuelve el archivo con el nombre que indica el servidor', async () => {
    const fetchSpy = mockFetch(
      new Response(new Blob(['%PDF-1.7']), {
        headers: {
          'content-type': 'application/pdf',
          'content-disposition': 'attachment; filename="F-2026-0001.pdf"',
        },
      }),
    )
    const { blob, filename } = await api.download('/invoices/x/pdf', 'application/pdf')
    expect(filename).toBe('F-2026-0001.pdf')
    expect(await blob.text()).toBe('%PDF-1.7')
    // Siempre con la cabecera anti-CSRF y sin caché.
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/admin/invoices/x/pdf',
      expect.objectContaining({ cache: 'no-store', headers: { 'X-Hodex-Request': '1' } }),
    )
  })

  it('si la sesión caducó, avisa (y vuelve al login) en vez de guardar un PDF roto', async () => {
    const onExpired = vi.fn()
    setUnauthenticatedListener(onExpired)
    mockFetch(
      new Response(JSON.stringify({ error: 'Unauthenticated', message: 'Tu sesión ha caducado.' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      }),
    )
    await expect(api.download('/invoices/x/pdf', 'application/pdf')).rejects.toMatchObject({
      status: 401,
      code: 'Unauthenticated',
    })
    expect(onExpired).toHaveBeenCalled()
  })

  it('rechaza una respuesta que no es un PDF aunque sea 200', async () => {
    mockFetch(new Response('<html>…</html>', { headers: { 'content-type': 'text/html' } }))
    const error = await api.download('/invoices/x/pdf', 'application/pdf').catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).code).toBe('UnexpectedContent')
  })

  it('traduce un fallo de red a un mensaje comprensible', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(api.download('/invoices/x/pdf', 'application/pdf')).rejects.toMatchObject({ code: 'NetworkError' })
  })
})
