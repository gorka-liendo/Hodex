import { Router, type Request, type Response } from 'express'
import { getRequestContext } from '../../lib/requestContext.js'
import { parseIdParam } from '../../lib/validation.js'
import { getAuth } from '../auth/auth.middleware.js'
import type { Actor } from '../contacts/contacts.service.js'
import { issueInvoice, verifyInvoiceChain } from './invoices.issue.js'
import { generateInvoicePdf } from './pdf/invoicePdf.service.js'
import { invoiceDraftSchema, invoiceListQuerySchema, paymentSchema, rectifySchema } from './invoices.schema.js'
import {
  createDraft,
  createRectifyingDraft,
  deleteDraft,
  getInvoice,
  listInvoices,
  setPayment,
  updateDraft,
} from './invoices.service.js'

const actorOf = (req: Request, res: Response): Actor => ({
  userId: getAuth(res).userId,
  context: getRequestContext(req, res),
})

/** Facturas emitidas, montado en /api/admin/invoices (requiere sesión). */
const router = Router()

router.get('/', async (req, res) => {
  res.json(await listInvoices(invoiceListQuerySchema.parse(req.query)))
})

// Integridad de la cadena de huellas (antes de /:id para que no lo capture).
router.get('/chain/verify', async (_req, res) => {
  res.json(await verifyInvoiceChain())
})

router.post('/', async (req, res) => {
  res.status(201).json(await createDraft(invoiceDraftSchema.parse(req.body), actorOf(req, res)))
})

router.get('/:id', async (req, res) => {
  res.json(await getInvoice(parseIdParam(req.params.id)))
})

router.get('/:id/pdf', async (req, res) => {
  const { pdf, filename } = await generateInvoicePdf(parseIdParam(req.params.id), actorOf(req, res))
  res
    .status(200)
    .type('application/pdf')
    .set('Content-Disposition', `attachment; filename="${filename}"`)
    .set('Content-Length', String(pdf.length))
    .send(pdf)
})

// Solo borradores (una emitida responde 409).
router.put('/:id', async (req, res) => {
  const id = parseIdParam(req.params.id)
  res.json(await updateDraft(id, invoiceDraftSchema.parse(req.body), actorOf(req, res)))
})

router.delete('/:id', async (req, res) => {
  await deleteDraft(parseIdParam(req.params.id), actorOf(req, res))
  res.status(204).end()
})

router.post('/:id/issue', async (req, res) => {
  res.json(await issueInvoice(parseIdParam(req.params.id), actorOf(req, res)))
})

router.post('/:id/payment', async (req, res) => {
  const { paidOn } = paymentSchema.parse(req.body)
  res.json(await setPayment(parseIdParam(req.params.id), paidOn, actorOf(req, res)))
})

router.post('/:id/rectify', async (req, res) => {
  const { reason } = rectifySchema.parse(req.body)
  res.status(201).json(await createRectifyingDraft(parseIdParam(req.params.id), reason, actorOf(req, res)))
})

export default router
