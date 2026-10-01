import { and, asc, count, eq, ilike, isNotNull, isNull, or, type SQL } from 'drizzle-orm'
import { getDb } from '../../db/client.js'
import { isUniqueViolation } from '../../db/errors.js'
import { contacts } from '../../db/schema/index.js'
import { AppError } from '../../lib/AppError.js'
import type { RequestContext } from '../../lib/requestContext.js'
import { likePattern } from '../../lib/validation.js'
import { recordAudit } from '../../services/audit.js'
import type { ContactInput, ContactListQuery } from './contacts.schema.js'

export type Contact = typeof contacts.$inferSelect

/** Quién hace el cambio (para la auditoría). */
export interface Actor {
  userId: string
  context: RequestContext
}

const notFound = () =>
  new AppError(404, 'Contacto no encontrado.', { code: 'NotFound' })

const duplicateTaxId = () =>
  new AppError(409, 'Ya existe un contacto activo con ese NIF/CIF.', {
    code: 'DuplicateTaxId',
    details: [{ path: ['taxId'], message: 'Ya existe un contacto activo con ese NIF/CIF' }],
  })

/** Traduce la violación del índice único de NIF a un 409 comprensible. */
function rethrowDuplicate(error: unknown): never {
  if (isUniqueViolation(error, 'contacts_tax_id_active_key')) throw duplicateTaxId()
  throw error
}

export async function listContacts(query: ContactListQuery) {
  const filters: SQL[] = [
    query.status === 'archived' ? isNotNull(contacts.archivedAt) : isNull(contacts.archivedAt),
  ]
  if (query.role === 'client') filters.push(eq(contacts.isClient, true))
  if (query.role === 'supplier') filters.push(eq(contacts.isSupplier, true))
  if (query.q) {
    const pattern = likePattern(query.q)
    filters.push(
      or(
        ilike(contacts.legalName, pattern),
        ilike(contacts.tradeName, pattern),
        ilike(contacts.taxId, pattern),
        ilike(contacts.email, pattern),
        ilike(contacts.city, pattern),
      )!,
    )
  }
  const where = and(...filters)

  const db = getDb()
  const [items, [totals]] = await Promise.all([
    db
      .select()
      .from(contacts)
      .where(where)
      .orderBy(asc(contacts.legalName), asc(contacts.id))
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize),
    db.select({ total: count() }).from(contacts).where(where),
  ])

  return { items, total: totals?.total ?? 0, page: query.page, pageSize: query.pageSize }
}

export async function getContact(id: string): Promise<Contact> {
  const [contact] = await getDb().select().from(contacts).where(eq(contacts.id, id)).limit(1)
  if (!contact) throw notFound()
  return contact
}

export async function createContact(input: ContactInput, actor: Actor): Promise<Contact> {
  try {
    return await getDb().transaction(async (tx) => {
      const [contact] = await tx.insert(contacts).values(input).returning()
      await recordAudit(
        {
          action: 'contact.create',
          outcome: 'success',
          userId: actor.userId,
          context: actor.context,
          metadata: { contactId: contact!.id },
        },
        tx,
      )
      return contact!
    })
  } catch (error) {
    rethrowDuplicate(error)
  }
}

export async function updateContact(
  id: string,
  input: ContactInput,
  actor: Actor,
): Promise<Contact> {
  const before = await getContact(id)
  const changed = (Object.keys(input) as Array<keyof ContactInput>).filter(
    (key) => before[key] !== input[key],
  )

  try {
    return await getDb().transaction(async (tx) => {
      const [contact] = await tx.update(contacts).set(input).where(eq(contacts.id, id)).returning()
      await recordAudit(
        {
          action: 'contact.update',
          outcome: 'success',
          userId: actor.userId,
          context: actor.context,
          // Solo QUÉ campos cambiaron, no sus valores (sin duplicar datos personales).
          metadata: { contactId: id, changed },
        },
        tx,
      )
      return contact!
    })
  } catch (error) {
    rethrowDuplicate(error)
  }
}

/** Archiva o restaura. Restaurar puede chocar con otro contacto activo con el mismo NIF. */
export async function setContactArchived(
  id: string,
  archived: boolean,
  actor: Actor,
): Promise<Contact> {
  await getContact(id)
  try {
    return await getDb().transaction(async (tx) => {
      const [contact] = await tx
        .update(contacts)
        .set({ archivedAt: archived ? new Date() : null })
        .where(eq(contacts.id, id))
        .returning()
      await recordAudit(
        {
          action: archived ? 'contact.archive' : 'contact.restore',
          outcome: 'success',
          userId: actor.userId,
          context: actor.context,
          metadata: { contactId: id },
        },
        tx,
      )
      return contact!
    })
  } catch (error) {
    rethrowDuplicate(error)
  }
}
