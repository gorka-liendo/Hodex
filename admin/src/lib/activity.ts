import type { AuditEntry } from '../api/audit'

const text = (value: unknown) => (typeof value === 'string' || typeof value === 'number' ? String(value) : null)

const LOGIN_FAILURE: Record<string, string> = {
  unknown_email: 'email desconocido',
  wrong_password: 'contraseña incorrecta',
  locked: 'cuenta bloqueada',
  mfa_not_configured: 'sin 2FA configurado',
}

/** Frase legible para cada acción registrada. */
export function describeEntry(entry: AuditEntry): string {
  const m = entry.metadata ?? {}
  const number = text(m.fullNumber)
  const ok = entry.outcome === 'success'
  switch (entry.action) {
    case 'auth.login.password':
      return ok ? 'Contraseña correcta (falta el código 2FA)' : `Intento de acceso fallido · ${LOGIN_FAILURE[text(m.reason) ?? ''] ?? 'credenciales'}`
    case 'auth.login.mfa':
      return ok
        ? m.method === 'recovery_code'
          ? 'Inicio de sesión con código de recuperación'
          : 'Inicio de sesión'
        : 'Código de verificación incorrecto'
    case 'auth.lockout':
      return 'Cuenta bloqueada temporalmente por intentos fallidos'
    case 'auth.reauth':
      return ok ? 'Confirmación con código 2FA' : 'Confirmación 2FA fallida'
    case 'auth.password.change':
      return ok ? 'Contraseña cambiada' : 'Cambio de contraseña rechazado (contraseña actual incorrecta)'
    case 'auth.recovery_codes.regenerate':
      return 'Nuevos códigos de recuperación'
    case 'auth.sessions.revoke_others':
      return `Cerradas las demás sesiones (${text(m.revoked) ?? 0})`
    case 'auth.admin_created':
      return 'Cuenta creada'
    case 'invoice.draft.create':
      return 'Borrador de factura creado'
    case 'invoice.draft.update':
      return 'Borrador de factura editado'
    case 'invoice.draft.delete':
      return 'Borrador de factura eliminado'
    case 'invoice.issue':
      return `Factura emitida${number ? ` · ${number}` : ''}`
    case 'invoice.rectifying.create':
      return 'Factura rectificativa creada'
    case 'invoice.payment.record':
      return `Factura marcada como cobrada${number ? ` · ${number}` : ''}`
    case 'invoice.payment.undo':
      return `Cobro deshecho${number ? ` · ${number}` : ''}`
    case 'invoice.pdf.download':
      return `PDF descargado${number ? ` · ${number}` : ''}`
    case 'invoice.send.email':
      return `Factura enviada por email${number ? ` · ${number}` : ''}${text(m.to) ? ` a ${text(m.to)}` : ''}`
    case 'invoice.send.whatsapp':
      return `Enlace de factura para WhatsApp${number ? ` · ${number}` : ''}`
    case 'invoice.link.open':
      return 'El cliente abrió el enlace de una factura'
    case 'invoice.link.revoke':
      return 'Enlace de factura revocado'
    case 'expense.create':
      return 'Gasto registrado'
    case 'expense.update':
      return 'Gasto editado'
    case 'expense.delete':
      return 'Gasto eliminado'
    case 'expense.attach':
      return 'Justificante añadido a un gasto'
    case 'attachment.upload':
      return 'Archivo subido'
    case 'attachment.delete':
      return `Archivo eliminado${text(m.filename) ? ` · ${text(m.filename)}` : ''}`
    case 'attachment.extract':
      return `Documento leído con IA${text(m.model) ? ` · ${text(m.model)}` : ''}`
    case 'contact.create':
      return 'Contacto creado'
    case 'contact.update':
      return 'Contacto editado'
    case 'contact.archive':
      return 'Contacto archivado'
    case 'contact.restore':
      return 'Contacto recuperado'
    case 'settings.company.update':
      return 'Datos de la empresa actualizados'
    case 'taxes.export.book':
      return `Libro de ${text(m.book) ?? ''} descargado (${text(m.quarter)}T ${text(m.year)})`
    case 'taxes.export.package':
      return `Paquete para la gestoría descargado (${text(m.quarter)}T ${text(m.year)})`
    default:
      return entry.action
  }
}

/** Navegador y sistema, en corto (no hace falta más para reconocer un acceso). */
export function describeDevice(userAgent: string | null): string | null {
  if (!userAgent) return null
  const browser = /Edg\//.test(userAgent)
    ? 'Edge'
    : /Firefox\//.test(userAgent)
      ? 'Firefox'
      : /Chrome\//.test(userAgent)
        ? 'Chrome'
        : /Safari\//.test(userAgent)
          ? 'Safari'
          : null
  const os = /iPhone|iPad/.test(userAgent)
    ? 'iPhone/iPad'
    : /Android/.test(userAgent)
      ? 'Android'
      : /Mac OS X/.test(userAgent)
        ? 'Mac'
        : /Windows/.test(userAgent)
          ? 'Windows'
          : /Linux/.test(userAgent)
            ? 'Linux'
            : null
  return [browser, os].filter(Boolean).join(' · ') || 'Otro dispositivo'
}
