import { logger } from '../../lib/logger.js'
import type { RequestContext } from '../../lib/requestContext.js'
import { sendEmail } from '../../services/email.js'

/**
 * Avisos de seguridad por email. Se envían "en segundo plano": si el envío
 * falla se registra, pero nunca bloquea ni rompe el inicio de sesión.
 */
function notify(to: string, subject: string, lines: string[]): void {
  void sendEmail({ to, subject, text: lines.join('\n') }).catch((err: unknown) => {
    logger.error({ err, subject }, 'No se pudo enviar el aviso de seguridad')
  })
}

function describe(context: RequestContext, when: Date): string[] {
  return [
    `Fecha: ${when.toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })}`,
    `IP: ${context.ip ?? 'desconocida'}`,
    `Navegador: ${context.userAgent ?? 'desconocido'}`,
  ]
}

const FOOTER = [
  '',
  'Si no has sido tú, cambia tu contraseña y cierra todas las sesiones desde el panel.',
  '— Hodex',
]

export function notifyNewLogin(to: string, context: RequestContext, when = new Date()): void {
  notify(to, 'Nuevo inicio de sesión en el panel de Hodex', [
    'Se ha iniciado sesión en tu panel de gestión.',
    '',
    ...describe(context, when),
    ...FOOTER,
  ])
}

export function notifyLockout(
  to: string,
  context: RequestContext,
  lockedUntil: Date,
  when = new Date(),
): void {
  notify(to, 'Cuenta del panel bloqueada temporalmente', [
    'Se han producido varios intentos fallidos de acceso y la cuenta se ha bloqueado.',
    `Desbloqueo automático: ${lockedUntil.toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })}`,
    '',
    'Último intento:',
    ...describe(context, when),
    ...FOOTER,
  ])
}

export function notifyRecoveryCodeUsed(
  to: string,
  context: RequestContext,
  remaining: number,
  when = new Date(),
): void {
  notify(to, 'Se ha usado un código de recuperación', [
    'Se ha iniciado sesión con un código de recuperación en lugar de la app de autenticación.',
    `Códigos restantes: ${remaining}`,
    '',
    ...describe(context, when),
    ...FOOTER,
  ])
}
