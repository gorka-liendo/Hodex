import { describe, expect, it } from 'vitest'
import type { AuditEntry } from '../api/audit'
import { describeDevice, describeEntry } from './activity'

const entry = (action: string, outcome: AuditEntry['outcome'] = 'success', metadata: AuditEntry['metadata'] = null): AuditEntry => ({
  id: 1,
  occurredAt: '2026-10-01T10:00:00Z',
  action,
  outcome,
  ipAddress: null,
  userAgent: null,
  metadata,
})

describe('describeEntry', () => {
  it('traduce las acciones a frases', () => {
    expect(describeEntry(entry('invoice.issue', 'success', { fullNumber: 'F-2026-0007' }))).toBe('Factura emitida · F-2026-0007')
    expect(describeEntry(entry('auth.login.password', 'failure', { reason: 'wrong_password' }))).toBe(
      'Intento de acceso fallido · contraseña incorrecta',
    )
    expect(describeEntry(entry('auth.login.mfa', 'success', { method: 'recovery_code' }))).toContain('código de recuperación')
    expect(describeEntry(entry('taxes.export.package', 'success', { year: 2026, quarter: 3 }))).toContain('3T 2026')
  })

  it('una acción desconocida se muestra tal cual', () => {
    expect(describeEntry(entry('algo.nuevo'))).toBe('algo.nuevo')
  })
})

describe('describeDevice', () => {
  it('resume navegador y sistema', () => {
    expect(
      describeDevice('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36'),
    ).toBe('Chrome · Mac')
    expect(describeDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1')).toBe(
      'Safari · iPhone/iPad',
    )
    expect(describeDevice('curl/8.0')).toBe('Otro dispositivo')
    expect(describeDevice(null)).toBeNull()
  })
})
