import { createInterface } from 'node:readline/promises'
import { eq } from 'drizzle-orm'
import QRCode from 'qrcode'
import { z } from 'zod'
import { env, isDatabaseConfigured } from '../config/env.js'
import { closeDb, getDb } from '../db/client.js'
import { adminUsers } from '../db/schema/index.js'
import { checkPasswordPolicy } from '../lib/password.js'
import { generateTotpSecret, totpUri, verifyTotp } from '../lib/totp.js'
import { createAdminUser } from '../modules/auth/adminUsers.service.js'

/**
 * Crea la cuenta del panel de forma interactiva (no existe registro público):
 *
 *   Local:      npm run admin:create
 *   Producción: railway ssh --service backend  →  npm run admin:create:prod
 *
 * El 2FA se configura aquí mismo y la cuenta no se crea hasta confirmar un
 * código válido, así que nunca existe una cuenta sin segundo factor.
 */

async function ask(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  try {
    return (await rl.question(question)).trim()
  } finally {
    rl.close()
  }
}

/** Pregunta sin mostrar lo que se escribe (para la contraseña). */
function askHidden(question: string): Promise<string> {
  const { stdin, stdout } = process
  if (!stdin.isTTY) {
    return Promise.reject(new Error('Hace falta una terminal interactiva.'))
  }
  return new Promise((resolve, reject) => {
    let value = ''
    const cleanup = () => {
      stdin.off('data', onData)
      stdin.setRawMode(false)
      stdin.pause()
      stdout.write('\n')
    }
    const onData = (chunk: string) => {
      for (const char of chunk) {
        if (char === '\r' || char === '\n') {
          cleanup()
          return resolve(value)
        }
        if (char === '\u0003') {
          cleanup()
          return reject(new Error('Cancelado.'))
        }
        if (char === '\u007f' || char === '\b') value = value.slice(0, -1)
        else value += char
      }
    }
    stdout.write(question)
    stdin.setRawMode(true)
    stdin.setEncoding('utf8')
    stdin.resume()
    stdin.on('data', onData)
  })
}

async function askEmail(): Promise<string> {
  for (;;) {
    const parsed = z.string().trim().toLowerCase().email().safeParse(await ask('Email: '))
    if (parsed.success) return parsed.data
    console.log('  ✗ Email no válido.\n')
  }
}

async function askPassword(email: string): Promise<string> {
  for (;;) {
    const password = await askHidden('Contraseña (no se muestra): ')
    const problems = checkPasswordPolicy(password, email)
    if (problems.length > 0) {
      problems.forEach((p) => console.log(`  ✗ ${p}`))
      console.log()
      continue
    }
    if ((await askHidden('Repite la contraseña: ')) !== password) {
      console.log('  ✗ No coinciden.\n')
      continue
    }
    return password
  }
}

async function main(): Promise<void> {
  if (!isDatabaseConfigured || !env.AUTH_ENCRYPTION_KEY) {
    throw new Error('Faltan DATABASE_URL y/o AUTH_ENCRYPTION_KEY en el entorno.')
  }

  console.log('\n── Nueva cuenta del panel de Hodex ──\n')
  const email = await askEmail()

  const [existing] = await getDb()
    .select({ id: adminUsers.id })
    .from(adminUsers)
    .where(eq(adminUsers.email, email))
    .limit(1)
  if (existing) throw new Error(`Ya existe una cuenta con ${email}.`)

  const password = await askPassword(email)

  // 2FA: QR en la terminal + clave manual por si la app no puede escanear.
  const secret = generateTotpSecret()
  console.log('\nEscanea este QR con tu app de autenticación (1Password, Google Authenticator…):\n')
  console.log(await QRCode.toString(totpUri(secret, email), { type: 'terminal', small: true }))
  console.log(`O introduce la clave a mano: ${secret.match(/.{1,4}/g)!.join(' ')}\n`)

  let confirmedStep: number | null = null
  for (let attempt = 1; attempt <= 3 && confirmedStep === null; attempt++) {
    confirmedStep = verifyTotp(secret, await ask('Código de 6 dígitos que muestra la app: '))
    if (confirmedStep === null) console.log('  ✗ Código incorrecto. Comprueba la hora del móvil.\n')
  }
  if (confirmedStep === null) throw new Error('No se pudo verificar el 2FA. Cuenta NO creada.')

  const { recoveryCodes } = await createAdminUser({
    email,
    password,
    totpSecret: secret,
    confirmedTotpStep: confirmedStep,
  })

  console.log('\n✓ Cuenta creada con 2FA activo.\n')
  console.log('CÓDIGOS DE RECUPERACIÓN — guárdalos ahora en tu gestor de contraseñas.')
  console.log('Cada uno sirve UNA vez si pierdes el móvil. No se volverán a mostrar.\n')
  recoveryCodes.forEach((code) => console.log(`   ${code}`))
  console.log()
}

try {
  await main()
} catch (err) {
  console.error(`\n✗ ${err instanceof Error ? err.message : String(err)}\n`)
  process.exitCode = 1
} finally {
  await closeDb()
}
