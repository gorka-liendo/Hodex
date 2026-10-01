import { Router } from 'express'
import { getRequestContext } from '../../lib/requestContext.js'
import { getAuth, requireRecentAuth } from '../auth/auth.middleware.js'
import { companySettingsSchema } from './settings.schema.js'
import { getCompanySettings, missingIssuerFields, updateCompanySettings } from './settings.service.js'

/** Ajustes, montado en /api/admin/settings (requiere sesión). */
const router = Router()

router.get('/company', async (_req, res) => {
  const settings = await getCompanySettings()
  res.json({ ...settings, missingForInvoicing: missingIssuerFields(settings) })
})

// Cambiar los datos fiscales (y sobre todo el IBAN de cobro) exige 2FA reciente.
router.put('/company', requireRecentAuth, async (req, res) => {
  const input = companySettingsSchema.parse(req.body)
  const settings = await updateCompanySettings(input, {
    userId: getAuth(res).userId,
    context: getRequestContext(req, res),
  })
  res.json({ ...settings, missingForInvoicing: missingIssuerFields(settings) })
})

export default router
