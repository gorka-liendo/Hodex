import type { Request, Response } from 'express'
import { getRequestContext } from '../../lib/requestContext.js'
import { parseIdParam } from '../../lib/validation.js'
import { getAuth } from '../auth/auth.middleware.js'
import { contactInputSchema, contactListQuerySchema } from './contacts.schema.js'
import {
  createContact,
  getContact,
  listContacts,
  setContactArchived,
  updateContact,
  type Actor,
} from './contacts.service.js'

const actorOf = (req: Request, res: Response): Actor => ({
  userId: getAuth(res).userId,
  context: getRequestContext(req, res),
})

/** GET /api/admin/contacts */
export async function list(req: Request, res: Response): Promise<void> {
  res.json(await listContacts(contactListQuerySchema.parse(req.query)))
}

/** GET /api/admin/contacts/:id */
export async function show(req: Request, res: Response): Promise<void> {
  res.json(await getContact(parseIdParam(req.params.id)))
}

/** POST /api/admin/contacts */
export async function create(req: Request, res: Response): Promise<void> {
  const contact = await createContact(contactInputSchema.parse(req.body), actorOf(req, res))
  res.status(201).json(contact)
}

/** PUT /api/admin/contacts/:id — reemplaza la ficha completa. */
export async function update(req: Request, res: Response): Promise<void> {
  const id = parseIdParam(req.params.id)
  const contact = await updateContact(id, contactInputSchema.parse(req.body), actorOf(req, res))
  res.json(contact)
}

/** POST /api/admin/contacts/:id/archive · /restore */
export function setArchived(archived: boolean) {
  return async (req: Request, res: Response): Promise<void> => {
    const id = parseIdParam(req.params.id)
    res.json(await setContactArchived(id, archived, actorOf(req, res)))
  }
}
