import { randomUUID } from 'node:crypto'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import pg from 'pg'
import { eq } from 'drizzle-orm'
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import * as schema from './schema/index.js'

/**
 * Tests de integración contra un Postgres real. Solo se ejecutan si existe
 * TEST_DATABASE_URL (nunca contra la base de datos de desarrollo ni producción):
 *
 *   docker compose up -d db
 *   docker compose exec db createdb -U hodex hodex_test
 *   TEST_DATABASE_URL=postgres://hodex:hodex_dev_only@localhost:5434/hodex_test npm test
 */
const url = process.env.TEST_DATABASE_URL

describe.skipIf(!url)('base de datos', () => {
  let pool: pg.Pool
  let db: NodePgDatabase<typeof schema>

  /** Crea un usuario con email único para que los tests no choquen entre ejecuciones. */
  async function createUser() {
    const [user] = await db
      .insert(schema.adminUsers)
      .values({ email: `test-${randomUUID()}@hodex.es`, passwordHash: 'x' })
      .returning()
    return user!
  }

  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: url })
    db = drizzle({ client: pool, schema })
    const migrationsFolder = resolve(
      dirname(fileURLToPath(import.meta.url)),
      '../../drizzle',
    )
    await migrate(db, { migrationsFolder })
  })

  afterAll(async () => {
    await pool?.end()
  })

  it('rechaza emails con mayúsculas', async () => {
    await expect(
      db
        .insert(schema.adminUsers)
        .values({ email: `Test-${randomUUID()}@hodex.es`, passwordHash: 'x' }),
    ).rejects.toThrow()
  })

  it('rechaza emails duplicados', async () => {
    const user = await createUser()
    await expect(
      db
        .insert(schema.adminUsers)
        .values({ email: user.email, passwordHash: 'y' }),
    ).rejects.toThrow()
  })

  describe('audit_log es de solo inserción', () => {
    it('permite insertar', async () => {
      const user = await createUser()
      const [row] = await db
        .insert(schema.auditLog)
        .values({ userId: user.id, action: 'test.insert', outcome: 'success' })
        .returning()
      expect(row?.id).toBeTypeOf('number')
    })

    it('rechaza UPDATE', async () => {
      const [row] = await db
        .insert(schema.auditLog)
        .values({ action: 'test.update', outcome: 'success' })
        .returning()
      await expect(
        db
          .update(schema.auditLog)
          .set({ outcome: 'failure' })
          .where(eq(schema.auditLog.id, row!.id)),
      ).rejects.toThrow()
    })

    it('rechaza DELETE', async () => {
      const [row] = await db
        .insert(schema.auditLog)
        .values({ action: 'test.delete', outcome: 'success' })
        .returning()
      await expect(
        db.delete(schema.auditLog).where(eq(schema.auditLog.id, row!.id)),
      ).rejects.toThrow()
    })

    it('rechaza TRUNCATE', async () => {
      await expect(pool.query('TRUNCATE audit_log')).rejects.toThrow(
        /solo inserción/,
      )
    })

    it('impide borrar un usuario con historial', async () => {
      const user = await createUser()
      await db
        .insert(schema.auditLog)
        .values({ userId: user.id, action: 'test.fk', outcome: 'success' })
      await expect(
        db.delete(schema.adminUsers).where(eq(schema.adminUsers.id, user.id)),
      ).rejects.toThrow()
    })
  })

  it('borrar un usuario sin historial elimina en cascada sus sesiones', async () => {
    const user = await createUser()
    await db.insert(schema.sessions).values({
      id: randomUUID(),
      userId: user.id,
      expiresAt: new Date(Date.now() + 60_000),
    })
    await db.delete(schema.adminUsers).where(eq(schema.adminUsers.id, user.id))
    const remaining = await db
      .select()
      .from(schema.sessions)
      .where(eq(schema.sessions.userId, user.id))
    expect(remaining).toHaveLength(0)
  })
})
