import { eq } from 'drizzle-orm'
import { getDb, type DbExecutor } from '../../db/client.js'
import { companySettings, type PartySnapshot } from '../../db/schema/index.js'
import { recordAudit } from '../../services/audit.js'
import type { Actor } from '../contacts/contacts.service.js'
import type { CompanySettingsInput } from './settings.schema.js'

export type CompanySettings = typeof companySettings.$inferSelect

const EMPTY: Omit<CompanySettings, 'createdAt' | 'updatedAt'> = {
  id: 1,
  legalName: null,
  tradeName: null,
  taxId: null,
  addressLine: null,
  postalCode: null,
  city: null,
  province: null,
  country: 'ES',
  email: null,
  phone: null,
  iban: null,
  paymentTermDays: 30,
  invoiceFooter: null,
}

export async function getCompanySettings(db: DbExecutor = getDb()) {
  const [row] = await db.select().from(companySettings).where(eq(companySettings.id, 1)).limit(1)
  return row ?? { ...EMPTY, createdAt: null, updatedAt: null }
}

/** Datos imprescindibles para emitir una factura completa. */
export function missingIssuerFields(settings: Awaited<ReturnType<typeof getCompanySettings>>): string[] {
  const required: Array<[keyof CompanySettings, string]> = [
    ['legalName', 'razón social'],
    ['taxId', 'NIF/CIF'],
    ['addressLine', 'dirección'],
    ['postalCode', 'código postal'],
    ['city', 'ciudad'],
  ]
  return required.filter(([key]) => !settings[key]).map(([, label]) => label)
}

export function issuerSnapshot(settings: Awaited<ReturnType<typeof getCompanySettings>>): PartySnapshot {
  return {
    legalName: settings.legalName!,
    tradeName: settings.tradeName,
    taxId: settings.taxId,
    addressLine: settings.addressLine,
    postalCode: settings.postalCode,
    city: settings.city,
    province: settings.province,
    country: settings.country,
    email: settings.email,
    phone: settings.phone,
    iban: settings.iban,
    invoiceFooter: settings.invoiceFooter,
  }
}

export async function updateCompanySettings(input: CompanySettingsInput, actor: Actor) {
  const before = await getCompanySettings()
  const changed = (Object.keys(input) as Array<keyof CompanySettingsInput>).filter(
    (key) => before[key] !== input[key],
  )
  return getDb().transaction(async (tx) => {
    const [row] = await tx
      .insert(companySettings)
      .values({ id: 1, ...input })
      .onConflictDoUpdate({ target: companySettings.id, set: input })
      .returning()
    await recordAudit(
      {
        action: 'settings.company.update',
        outcome: 'success',
        userId: actor.userId,
        context: actor.context,
        // El IBAN se señala expresamente: es el cambio más delicado.
        metadata: { changed, ibanChanged: changed.includes('iban') },
      },
      tx,
    )
    return row!
  })
}
