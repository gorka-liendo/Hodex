import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import { and, eq } from 'drizzle-orm'
import { createApp } from '../../app.js'
import { closeDb, getDb } from '../../db/client.js'
import { auditLog } from '../../db/schema/index.js'
import { hasTestDatabase, migrateTestDatabase } from '../../test/db.js'
import { PANEL_HEADERS, signedInPanel } from '../../test/session.js'

const app = createApp()

/** Genera un CIF válido y único (los tests comparten base de datos). */
function uniqueCif(): string {
  const digits = String(Math.floor(Math.random() * 1e7)).padStart(7, '0')
  let sum = 0
  for (let i = 0; i < 7; i++) {
    const n = Number(digits[i])
    sum += i % 2 === 0 ? Math.floor((n * 2) / 10) + ((n * 2) % 10) : n
  }
  return `B${digits}${(10 - (sum % 10)) % 10}`
}

const baseContact = () => ({
  isClient: true,
  isSupplier: false,
  legalName: `Acme ${randomUUID().slice(0, 8)} SL`,
  tradeName: '',
  country: 'ES',
  taxId: uniqueCif(),
  email: 'Facturas@Acme.es',
  phone: '+34 600 000 000',
  addressLine: 'Calle Mayor 1',
  postalCode: '28001',
  city: 'Madrid',
  province: 'Madrid',
  notes: '',
})

type Panel = Awaited<ReturnType<typeof signedInPanel>>

describe.skipIf(!hasTestDatabase)('contactos', () => {
  let panel: Panel

  beforeAll(async () => {
    await migrateTestDatabase(getDb())
    panel = await signedInPanel(app)
  })

  afterAll(async () => {
    await closeDb()
  })

  it('sin sesión responde 401', async () => {
    const res = await request(app).get('/api/admin/contacts').set(PANEL_HEADERS)
    expect(res.status).toBe(401)
  })

  it('crea un contacto normalizando NIF, email y campos vacíos', async () => {
    const input = baseContact()
    const res = await panel.post('/contacts', {
      ...input,
      taxId: `es-${input.taxId.toLowerCase()}`, // con prefijo intracomunitario y minúsculas
    })
    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({
      legalName: input.legalName,
      taxId: input.taxId,
      email: 'facturas@acme.es',
      tradeName: null,
      notes: null,
      archivedAt: null,
    })

    const audit = await getDb()
      .select()
      .from(auditLog)
      .where(and(eq(auditLog.userId, panel.userId), eq(auditLog.action, 'contact.create')))
    expect(audit.some((row) => row.metadata?.contactId === res.body.id)).toBe(true)
  })

  it.each([
    ['NIF con control incorrecto', { taxId: 'B12345675' }, 'taxId'],
    ['sin rol', { isClient: false, isSupplier: false }, 'isClient'],
    ['sin razón social', { legalName: '   ' }, 'legalName'],
    ['email inválido', { email: 'no-es-email' }, 'email'],
    ['código postal español inválido', { postalCode: '123' }, 'postalCode'],
  ])('rechaza %s con el error en su campo', async (_label, override, field) => {
    const res = await panel.post('/contacts', { ...baseContact(), ...override })
    expect(res.status).toBe(400)
    expect(res.body.issues.map((i: { path: string[] }) => i.path[0])).toContain(field)
  })

  it('no valida el NIF con reglas españolas si el país es otro', async () => {
    const res = await panel.post('/contacts', {
      ...baseContact(),
      country: 'fr',
      taxId: `FR${Math.floor(Math.random() * 1e11)}`,
      postalCode: '75001',
    })
    expect(res.status).toBe(201)
    expect(res.body.country).toBe('FR')
  })

  it('rechaza campos desconocidos (p. ej. intentar fijar el id)', async () => {
    const res = await panel.post('/contacts', { ...baseContact(), id: randomUUID() })
    expect(res.status).toBe(400)
  })

  it('no permite dos contactos activos con el mismo NIF (409)', async () => {
    const input = baseContact()
    await panel.post('/contacts', input).expect(201)
    const res = await panel.post('/contacts', { ...input, legalName: 'Otra SL' })
    expect(res.status).toBe(409)
    expect(res.body.error).toBe('DuplicateTaxId')
  })

  it('lista con búsqueda, filtro por rol y paginación', async () => {
    const tag = randomUUID().slice(0, 8)
    await panel.post('/contacts', { ...baseContact(), legalName: `Buscable ${tag} Cliente SL` })
    await panel.post('/contacts', {
      ...baseContact(),
      legalName: `Buscable ${tag} Proveedor SL`,
      isClient: false,
      isSupplier: true,
    })

    const all = await panel.get(`/contacts?q=${tag}`)
    expect(all.body.total).toBe(2)

    const suppliers = await panel.get(`/contacts?q=${tag}&role=supplier`)
    expect(suppliers.body.items.map((c: { legalName: string }) => c.legalName)).toEqual([
      `Buscable ${tag} Proveedor SL`,
    ])

    const firstPage = await panel.get(`/contacts?q=${tag}&pageSize=1`)
    expect(firstPage.body.items).toHaveLength(1)
    expect(firstPage.body.total).toBe(2)
  })

  it('la búsqueda trata % y _ como texto literal', async () => {
    const res = await panel.get('/contacts?q=%25')
    expect(res.status).toBe(200)
    expect(res.body.items.every((c: { legalName: string }) => c.legalName.includes('%'))).toBe(true)
  })

  it('edita y audita solo los nombres de los campos cambiados', async () => {
    const created = (await panel.post('/contacts', baseContact())).body
    const res = await panel.put(`/contacts/${created.id}`, {
      ...baseContact(),
      taxId: created.taxId,
      legalName: 'Nombre Nuevo SL',
      city: 'Bilbao',
      province: 'Madrid',
      postalCode: '28001',
    })
    expect(res.status).toBe(200)
    expect(res.body.legalName).toBe('Nombre Nuevo SL')

    const [row] = await getDb()
      .select()
      .from(auditLog)
      .where(and(eq(auditLog.action, 'contact.update'), eq(auditLog.userId, panel.userId)))
    expect(row?.metadata?.changed).toEqual(expect.arrayContaining(['legalName', 'city']))
    expect(JSON.stringify(row?.metadata)).not.toContain('Bilbao')
  })

  it('archiva y restaura; archivado libera el NIF', async () => {
    const input = baseContact()
    const created = (await panel.post('/contacts', input)).body

    const archived = await panel.post(`/contacts/${created.id}/archive`)
    expect(archived.body.archivedAt).not.toBeNull()
    expect((await panel.get(`/contacts?q=${input.taxId}`)).body.total).toBe(0)
    expect((await panel.get(`/contacts?q=${input.taxId}&status=archived`)).body.total).toBe(1)

    // Con el original archivado, otro contacto puede usar ese NIF…
    const replacement = await panel.post('/contacts', { ...input, legalName: 'Sucesora SL' })
    expect(replacement.status).toBe(201)
    // …y entonces restaurar el original chocaría: 409.
    expect((await panel.post(`/contacts/${created.id}/restore`)).status).toBe(409)
  })

  it('un id inexistente o mal formado responde 404', async () => {
    expect((await panel.get(`/contacts/${randomUUID()}`)).status).toBe(404)
    expect((await panel.get('/contacts/no-es-un-uuid')).status).toBe(404)
    expect((await panel.put(`/contacts/${randomUUID()}`, baseContact())).status).toBe(404)
  })

  it('limita el tamaño de página', async () => {
    expect((await panel.get('/contacts?pageSize=1000')).status).toBe(400)
  })
})
