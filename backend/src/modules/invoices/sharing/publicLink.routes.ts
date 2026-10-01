import { Router } from 'express'
import { getRequestContext } from '../../../lib/requestContext.js'
import { publicLinkRateLimiter } from '../../../middleware/rateLimit.js'
import { openShareLink } from './invoiceSharing.service.js'

/**
 * Ruta PÚBLICA de los enlaces de factura (/api/f/:token): el cliente abre el
 * PDF sin cuenta. Respuesta idéntica para enlaces inexistentes, caducados o
 * revocados, sin caché ni indexación.
 */
const router = Router()

const NOT_AVAILABLE = `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="robots" content="noindex">
<title>Enlace no disponible</title>
<body style="margin:0;display:flex;min-height:100vh;align-items:center;justify-content:center;background:#fafafa;font-family:Helvetica,Arial,sans-serif;color:#111010">
<div style="max-width:420px;padding:32px;text-align:center"><p style="font-size:22px;font-weight:300;margin:0 0 12px">Enlace no disponible</p>
<p style="color:#6e6e6e;margin:0">Este enlace ha caducado o ya no es válido. Pide a quien te lo envió uno nuevo.</p></div></body></html>`

router.get('/:token', publicLinkRateLimiter, async (req, res) => {
  res.set('Cache-Control', 'private, no-store')
  res.set('X-Robots-Tag', 'noindex, nofollow, noarchive')
  const result = await openShareLink(String(req.params.token), getRequestContext(req, res))
  if (!result) {
    res.status(404).type('html').send(NOT_AVAILABLE)
    return
  }
  res
    .status(200)
    .type('application/pdf')
    .set('Content-Disposition', `inline; filename="${result.filename}"`)
    .send(result.pdf)
})

export default router
