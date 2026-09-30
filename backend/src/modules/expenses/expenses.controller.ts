import type { Request, Response } from 'express'
import { getRequestContext } from '../../lib/requestContext.js'
import { parseIdParam } from '../../lib/validation.js'
import { getAuth } from '../auth/auth.middleware.js'
import type { Actor } from '../contacts/contacts.service.js'
import { expenseInputSchema, expenseListQuerySchema } from './expenses.schema.js'
import {
  createExpense,
  deleteExpense,
  getExpense,
  listExpenses,
  updateExpense,
} from './expenses.service.js'

const actorOf = (req: Request, res: Response): Actor => ({
  userId: getAuth(res).userId,
  context: getRequestContext(req, res),
})

/** GET /api/admin/expenses */
export async function list(req: Request, res: Response): Promise<void> {
  res.json(await listExpenses(expenseListQuerySchema.parse(req.query)))
}

/** GET /api/admin/expenses/:id */
export async function show(req: Request, res: Response): Promise<void> {
  res.json(await getExpense(parseIdParam(req.params.id)))
}

/** POST /api/admin/expenses */
export async function create(req: Request, res: Response): Promise<void> {
  res.status(201).json(await createExpense(expenseInputSchema.parse(req.body), actorOf(req, res)))
}

/** PUT /api/admin/expenses/:id */
export async function update(req: Request, res: Response): Promise<void> {
  const id = parseIdParam(req.params.id)
  res.json(await updateExpense(id, expenseInputSchema.parse(req.body), actorOf(req, res)))
}

/** DELETE /api/admin/expenses/:id — acción sensible (exige 2FA reciente). */
export async function remove(req: Request, res: Response): Promise<void> {
  await deleteExpense(parseIdParam(req.params.id), actorOf(req, res))
  res.status(204).end()
}
