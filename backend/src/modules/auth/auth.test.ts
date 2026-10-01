import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import { and, eq } from 'drizzle-orm'

// Los avisos de seguridad no deben enviar emails reales.
vi.mock('../../services/email.js', () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}))

import { createApp } from '../../app.js'
import { closeDb, getDb } from '../../db/client.js'
import { adminUsers, auditLog, sessions } from '../../db/schema/index.js'
import { generateTotpSecret, totpCode } from '../../lib/totp.js'
import { sendEmail } from '../../services/email.js'
import { hasTestDatabase, migrateTestDatabase } from '../../test/db.js'
import { createAdminUser } from './adminUsers.service.js'

const app = createApp()

/** Cabeceras que añaden el gateway (nginx) y el frontend del panel. */
const PANEL_HEADERS = {
  'x-hodex-gateway': process.env.ADMIN_GATEWAY_SECRET!,
  origin: 'http://localhost:5174',
  'x-hodex-request': '1',
}

const PASSWORD = 'caballo-bateria-grapa-correcta'

interface TestUser {
  id: string
  email: string
  totpSecret: string
  recoveryCodes: string[]
}

/** Usuario nuevo por test: aislados entre sí y entre ejecuciones. */
async function createUser(): Promise<TestUser> {
  const email = `admin-${randomUUID()}@hodex.es`
  const totpSecret = generateTotpSecret()
  const { id, recoveryCodes } = await createAdminUser({ email, password: PASSWORD, totpSecret })
  return { id, email, totpSecret, recoveryCodes }
}

/** Código TOTP desplazado `steps` ventanas de 30 s (±1 es aceptado). */
const codeFor = (user: TestUser, steps = 0) =>
  totpCode(user.totpSecret, Date.now() + steps * 30_000)

/** Navegador simulado: guarda cookies y envía las cabeceras del panel. */
function browser() {
  const agent = request.agent(app)
  return {
    post: (path: string, body: object = {}) =>
      agent.post(`/api/admin${path}`).set(PANEL_HEADERS).send(body),
    get: (path: string) => agent.get(`/api/admin${path}`).set(PANEL_HEADERS),
  }
}

async function signIn(user: TestUser, secondFactor: object) {
  const b = browser()
  await b.post('/auth/login', { email: user.email, password: PASSWORD }).expect(200)
  const res = await b.post('/auth/login/verify', secondFactor)
  return { b, res }
}

/** Busca la cookie `name` en la respuesta, con o sin prefijo __Host-. */
function findCookie(res: request.Response, name: string): string | undefined {
  const raw = res.headers['set-cookie'] as unknown as string[] | undefined
  return raw?.find((c) => c.replace('__Host-', '').startsWith(`${name}=`))
}

async function auditActions(userId: string): Promise<string[]> {
  const rows = await getDb()
    .select({ action: auditLog.action, outcome: auditLog.outcome })
    .from(auditLog)
    .where(eq(auditLog.userId, userId))
  return rows.map((r) => `${r.action}:${r.outcome}`)
}

describe.skipIf(!hasTestDatabase)('autenticación del panel', () => {
  beforeAll(async () => {
    await migrateTestDatabase(getDb())
  })

  afterAll(async () => {
    await closeDb()
  })

  beforeEach(() => {
    vi.mocked(sendEmail).mockClear()
  })

  describe('perímetro', () => {
    it('sin el secreto del gateway responde 404 (como si no existiera)', async () => {
      const res = await request(app).get('/api/admin/auth/session')
      expect(res.status).toBe(404)
      expect(res.body.error).toBe('NotFound')
    })

    it('con un secreto de gateway incorrecto responde 404', async () => {
      const res = await request(app)
        .get('/api/admin/auth/session')
        .set('x-hodex-gateway', 'secreto-equivocado-0123456789abcdef')
      expect(res.status).toBe(404)
    })

    it.each([
      ['sin Origin', { origin: undefined }],
      ['con Origin ajeno', { origin: 'https://evil.example' }],
      ['sin cabecera X-Hodex-Request', { 'x-hodex-request': undefined }],
    ])('rechaza escrituras %s (CSRF → 403)', async (_label, override) => {
      const headers: Record<string, string> = { ...PANEL_HEADERS }
      for (const [key, value] of Object.entries(override)) {
        if (value === undefined) delete headers[key]
        else headers[key] = value
      }
      const res = await request(app)
        .post('/api/admin/auth/login')
        .set(headers)
        .send({ email: 'x@hodex.es', password: 'x' })
      expect(res.status).toBe(403)
      expect(res.body.error).toBe('Forbidden')
    })

    it('las respuestas no se cachean', async () => {
      const res = await browser().get('/auth/session')
      expect(res.headers['cache-control']).toBe('no-store')
    })

    it('sin sesión, las rutas protegidas responden 401', async () => {
      const res = await browser().get('/auth/session')
      expect(res.status).toBe(401)
      expect(res.body.error).toBe('Unauthenticated')
    })

    it('rechaza campos inesperados en el login (400)', async () => {
      const res = await browser().post('/auth/login', {
        email: 'x@hodex.es',
        password: 'x',
        isAdmin: true,
      })
      expect(res.status).toBe(400)
    })
  })

  describe('paso 1: contraseña', () => {
    it('email inexistente y contraseña incorrecta dan la MISMA respuesta', async () => {
      const user = await createUser()
      const unknown = await browser().post('/auth/login', {
        email: `nadie-${randomUUID()}@hodex.es`,
        password: PASSWORD,
      })
      const wrong = await browser().post('/auth/login', {
        email: user.email,
        password: 'contraseña-incorrecta-123',
      })
      expect(unknown.status).toBe(401)
      expect(wrong.status).toBe(401)
      expect(unknown.body).toEqual(wrong.body)
      expect(unknown.headers['set-cookie']).toBeUndefined()
      expect(wrong.headers['set-cookie']).toBeUndefined()
    })

    it('con la contraseña correcta pide el 2FA y NO crea sesión todavía', async () => {
      const user = await createUser()
      const res = await browser().post('/auth/login', {
        email: user.email.toUpperCase(), // el email no distingue mayúsculas
        password: PASSWORD,
      })
      expect(res.status).toBe(200)
      expect(res.body).toEqual({ status: 'mfa_required' })

      const challenge = findCookie(res, 'hodex_mfa')
      expect(challenge).toMatch(/HttpOnly/i)
      expect(challenge).toMatch(/SameSite=Strict/i)
      expect(findCookie(res, 'hodex_session')).toBeUndefined()
    })
  })

  describe('paso 2: código 2FA', () => {
    it('sin haber pasado el paso 1 responde LoginExpired', async () => {
      const res = await browser().post('/auth/login/verify', { code: '123456' })
      expect(res.status).toBe(401)
      expect(res.body.error).toBe('LoginExpired')
    })

    it('con el código correcto crea la sesión, audita y avisa por email', async () => {
      const user = await createUser()
      const b = browser()
      await b.post('/auth/login', { email: user.email, password: PASSWORD }).expect(200)

      const wrong = await b.post('/auth/login/verify', { code: '000000' })
      expect(wrong.status).toBe(401)

      const res = await b.post('/auth/login/verify', { code: codeFor(user) })
      expect(res.status).toBe(200)
      expect(res.body.user.email).toBe(user.email)

      const session = findCookie(res, 'hodex_session')
      expect(session).toMatch(/HttpOnly/i)
      expect(session).toMatch(/SameSite=Strict/i)

      const me = await b.get('/auth/session')
      expect(me.status).toBe(200)
      expect(me.body.user.email).toBe(user.email)
      expect(me.body.recoveryCodesRemaining).toBe(10)

      expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: user.email }))
      expect(await auditActions(user.id)).toEqual(
        expect.arrayContaining([
          'auth.login.password:success',
          'auth.login.mfa:failure',
          'auth.login.mfa:success',
        ]),
      )
    })

    it('un código ya usado no vale otra vez (anti-replay)', async () => {
      const user = await createUser()
      const code = codeFor(user)
      expect((await signIn(user, { code })).res.status).toBe(200)
      expect((await signIn(user, { code })).res.status).toBe(401)
    })

    it('un código de recuperación funciona una sola vez', async () => {
      const user = await createUser()
      // Se acepta tal como lo teclee el usuario: minúsculas y sin guiones.
      const code = user.recoveryCodes[0]!.toLowerCase().replaceAll('-', '')

      const first = await signIn(user, { recoveryCode: code })
      expect(first.res.status).toBe(200)
      expect((await first.b.get('/auth/session')).body.recoveryCodesRemaining).toBe(9)

      expect((await signIn(user, { recoveryCode: code })).res.status).toBe(401)
    })

    it('tras 5 códigos fallidos el desafío deja de valer', async () => {
      const user = await createUser()
      const b = browser()
      await b.post('/auth/login', { email: user.email, password: PASSWORD }).expect(200)
      for (let i = 0; i < 5; i++) {
        await b.post('/auth/login/verify', { code: '000000' }).expect(401)
      }
      const res = await b.post('/auth/login/verify', { code: codeFor(user) })
      expect(res.status).toBe(401)
      expect(res.body.error).toBe('LoginExpired')
    })
  })

  describe('bloqueo por fuerza bruta', () => {
    it('tras 5 fallos bloquea la cuenta aunque luego acierte, y avisa', async () => {
      const user = await createUser()
      for (let i = 0; i < 5; i++) {
        await browser()
          .post('/auth/login', { email: user.email, password: `incorrecta-${i}-xxxxxx` })
          .expect(401)
      }

      const res = await browser().post('/auth/login', { email: user.email, password: PASSWORD })
      expect(res.status).toBe(401)
      expect(res.body.error).toBe('InvalidCredentials')

      const [row] = await getDb().select().from(adminUsers).where(eq(adminUsers.id, user.id))
      expect(row!.lockedUntil!.getTime()).toBeGreaterThan(Date.now())
      expect(await auditActions(user.id)).toContain('auth.lockout:success')
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({ to: user.email, subject: expect.stringMatching(/bloqueada/) }),
      )
    })
  })

  describe('sesión', () => {
    async function sessionRow(userId: string) {
      const [row] = await getDb().select().from(sessions).where(eq(sessions.userId, userId))
      return row!
    }

    it('logout invalida la sesión', async () => {
      const user = await createUser()
      const { b } = await signIn(user, { code: codeFor(user) })
      await b.post('/auth/logout').expect(204)
      expect((await b.get('/auth/session')).status).toBe(401)
    })

    it('caduca tras 30 min de inactividad y se borra', async () => {
      const user = await createUser()
      const { b } = await signIn(user, { code: codeFor(user) })
      const row = await sessionRow(user.id)
      await getDb()
        .update(sessions)
        .set({ lastSeenAt: new Date(Date.now() - 31 * 60_000) })
        .where(eq(sessions.id, row.id))

      expect((await b.get('/auth/session')).status).toBe(401)
      const remaining = await getDb().select().from(sessions).where(eq(sessions.id, row.id))
      expect(remaining).toHaveLength(0)
    })

    it('caduca al llegar a su límite absoluto', async () => {
      const user = await createUser()
      const { b } = await signIn(user, { code: codeFor(user) })
      await getDb()
        .update(sessions)
        .set({ expiresAt: new Date(Date.now() - 1000) })
        .where(eq(sessions.userId, user.id))
      expect((await b.get('/auth/session')).status).toBe(401)
    })

    it('cambiar la contraseña invalida las sesiones anteriores', async () => {
      const user = await createUser()
      const { b } = await signIn(user, { code: codeFor(user) })
      await getDb()
        .update(adminUsers)
        .set({ passwordChangedAt: new Date(Date.now() + 1000) })
        .where(eq(adminUsers.id, user.id))
      expect((await b.get('/auth/session')).status).toBe(401)
    })

    it('un token inventado no sirve', async () => {
      const res = await request(app)
        .get('/api/admin/auth/session')
        .set(PANEL_HEADERS)
        .set('Cookie', `hodex_session=${'A'.repeat(43)}`)
      expect(res.status).toBe(401)
    })

    it('logout-others cierra las demás sesiones pero no la actual', async () => {
      const user = await createUser()
      const laptop = await signIn(user, { code: codeFor(user) })
      const phone = await signIn(user, { code: codeFor(user, 1) })
      expect(phone.res.status).toBe(200)

      const res = await laptop.b.post('/auth/logout-others')
      expect(res.body.revoked).toBe(1)
      expect((await laptop.b.get('/auth/session')).status).toBe(200)
      expect((await phone.b.get('/auth/session')).status).toBe(401)
    })

    it('reauth renueva la confirmación del 2FA', async () => {
      const user = await createUser()
      const { b } = await signIn(user, { code: codeFor(user) })
      const before = (await sessionRow(user.id)).reauthenticatedAt

      await b.post('/auth/reauth', { code: '000000' }).expect(401)
      await b.post('/auth/reauth', { recoveryCode: user.recoveryCodes[1] }).expect(204)

      const after = (await sessionRow(user.id)).reauthenticatedAt
      expect(after.getTime()).toBeGreaterThan(before.getTime())
      const rows = await getDb()
        .select()
        .from(auditLog)
        .where(and(eq(auditLog.userId, user.id), eq(auditLog.action, 'auth.reauth')))
      expect(rows.map((r) => r.outcome).sort()).toEqual(['failure', 'success'])
    })
  })

  describe('credenciales', () => {
    const NEW_PASSWORD = 'lampara-niebla-tejado-verde'

    /** Simula que la última confirmación del 2FA fue hace 11 minutos. */
    const expireReauth = (userId: string) =>
      getDb()
        .update(sessions)
        .set({ reauthenticatedAt: new Date(Date.now() - 11 * 60_000) })
        .where(eq(sessions.userId, userId))

    it('cambiar la contraseña exige 2FA reciente', async () => {
      const user = await createUser()
      const { b } = await signIn(user, { code: codeFor(user) })
      await expireReauth(user.id)
      const res = await b.post('/auth/password', { currentPassword: PASSWORD, newPassword: NEW_PASSWORD })
      expect(res.status).toBe(403)
      expect(res.body.error).toBe('ReauthRequired')
    })

    it('cambia la contraseña, mantiene esta sesión y cierra las demás', async () => {
      const user = await createUser()
      const laptop = await signIn(user, { code: codeFor(user) })
      const phone = await signIn(user, { code: codeFor(user, 1) })

      const res = await laptop.b.post('/auth/password', { currentPassword: PASSWORD, newPassword: NEW_PASSWORD })
      expect(res.status).toBe(204)
      expect(findCookie(res, 'hodex_session')).toBeDefined()

      expect((await laptop.b.get('/auth/session')).status).toBe(200)
      expect((await phone.b.get('/auth/session')).status).toBe(401)

      // La antigua ya no entra; la nueva sí.
      await browser().post('/auth/login', { email: user.email, password: PASSWORD }).expect(401)
      await browser().post('/auth/login', { email: user.email, password: NEW_PASSWORD }).expect(200)
      expect(await auditActions(user.id)).toContain('auth.password.change:success')
      expect(vi.mocked(sendEmail).mock.calls.some(([m]) => m.subject.includes('contraseña'))).toBe(true)
    })

    it.each([
      ['la actual es incorrecta', { currentPassword: 'no-es-la-buena-123', newPassword: NEW_PASSWORD }, 'currentPassword'],
      ['la nueva es débil', { currentPassword: PASSWORD, newPassword: 'corta' }, 'newPassword'],
      ['la nueva es igual a la actual', { currentPassword: PASSWORD, newPassword: PASSWORD }, 'newPassword'],
    ])('rechaza el cambio si %s', async (_label, body, field) => {
      const user = await createUser()
      const { b } = await signIn(user, { code: codeFor(user) })
      const res = await b.post('/auth/password', body)
      expect(res.status).toBe(400)
      expect(res.body.details[0].path).toEqual([field])
      await browser().post('/auth/login', { email: user.email, password: PASSWORD }).expect(200)
    })

    it('una contraseña actual incorrecta cuenta para el bloqueo', async () => {
      const user = await createUser()
      const { b } = await signIn(user, { code: codeFor(user) })
      await b.post('/auth/password', { currentPassword: 'no-es-la-buena-123', newPassword: NEW_PASSWORD }).expect(400)
      const [row] = await getDb().select().from(adminUsers).where(eq(adminUsers.id, user.id))
      expect(row!.failedLoginCount).toBe(1)
    })

    it('regenera los códigos de recuperación: los viejos dejan de valer', async () => {
      const user = await createUser()
      const { b } = await signIn(user, { code: codeFor(user) })

      await expireReauth(user.id)
      await b.post('/auth/recovery-codes').expect(403)
      await b.post('/auth/reauth', { code: codeFor(user, 1) }).expect(204)

      const res = await b.post('/auth/recovery-codes')
      expect(res.status).toBe(200)
      const codes: string[] = res.body.recoveryCodes
      expect(codes).toHaveLength(10)
      expect(codes.some((c) => user.recoveryCodes.includes(c))).toBe(false)

      await b.post('/auth/reauth', { recoveryCode: user.recoveryCodes[2] }).expect(401)
      await b.post('/auth/reauth', { recoveryCode: codes[0] }).expect(204)
      expect((await b.get('/auth/session')).body.recoveryCodesRemaining).toBe(9)
      expect(await auditActions(user.id)).toContain('auth.recovery_codes.regenerate:success')
    })
  })
})
