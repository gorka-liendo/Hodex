import { Router, type Request, type Response } from 'express'
import { z } from 'zod'
import { getRequestContext } from '../../lib/requestContext.js'
import { todayInSpain } from '../../lib/periods.js'
import { getAuth, requireRecentAuth } from '../auth/auth.middleware.js'
import type { Actor } from '../contacts/contacts.service.js'
import { quarterToFile, type Quarter } from './taxCalc.js'
import { getQuarterTaxes, quarterBook, quarterPackage } from './taxes.service.js'

const actorOf = (req: Request, res: Response): Actor => ({
  userId: getAuth(res).userId,
  context: getRequestContext(req, res),
})

const periodSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  quarter: z.coerce.number().int().min(1).max(4).optional(),
})

/** Trimestre pedido; por defecto, el último terminado (el que toca declarar). */
function periodOf(req: Request): Quarter {
  const query = periodSchema.parse(req.query)
  const fallback = quarterToFile(todayInSpain())
  return {
    year: query.year ?? fallback.year,
    quarter: (query.quarter ?? (query.year ? 1 : fallback.quarter)) as Quarter['quarter'],
  }
}

function sendFile(res: Response, file: { filename: string; content: Buffer }, type: string) {
  res.setHeader('Content-Type', type)
  res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`)
  res.setHeader('Content-Length', file.content.length)
  res.end(file.content)
}

/** Impuestos trimestrales, montado en /api/admin/taxes (requiere sesión). */
const router = Router()

router.get('/', async (req, res) => {
  res.json(await getQuarterTaxes(periodOf(req)))
})

// Exportar datos es sensible: exige haber confirmado el 2FA hace poco.
router.get('/books/:book', requireRecentAuth, async (req, res) => {
  const book = z.enum(['ingresos', 'gastos']).parse(req.params.book)
  sendFile(res, await quarterBook(periodOf(req), book, actorOf(req, res)), 'text/csv; charset=utf-8')
})

router.get('/package', requireRecentAuth, async (req, res) => {
  sendFile(res, await quarterPackage(periodOf(req), actorOf(req, res)), 'application/zip')
})

export default router
