import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '../../api/client'
import { settingsApi, settingsKeys, type CompanySettings, type CompanySettingsInput } from '../../api/settings'
import { Eyebrow } from '../../components/brand'
import { Button } from '../../components/Button'
import { SelectField, TextAreaField, TextField } from '../../components/fields'
import { QueryStatus } from '../../components/lists'
import { Notice } from '../../components/Notice'
import { PageHeader } from '../../components/PageHeader'
import { ReauthPrompt } from '../../components/ReauthPrompt'
import { COUNTRY_OPTIONS } from '../../lib/countries'

type TextKey = Exclude<keyof CompanySettingsInput, 'paymentTermDays'>
type FormValues = Record<TextKey, string> & { paymentTermDays: string }

function toForm(settings: CompanySettings): FormValues {
  return {
    legalName: settings.legalName ?? '',
    tradeName: settings.tradeName ?? '',
    taxId: settings.taxId ?? '',
    addressLine: settings.addressLine ?? '',
    postalCode: settings.postalCode ?? '',
    city: settings.city ?? '',
    province: settings.province ?? '',
    country: settings.country,
    email: settings.email ?? '',
    phone: settings.phone ?? '',
    iban: settings.iban ? settings.iban.replace(/(.{4})(?=.)/g, '$1 ') : '',
    paymentTermDays: String(settings.paymentTermDays),
    invoiceFooter: settings.invoiceFooter ?? '',
  }
}

export function CompanySettingsPage() {
  const query = useQuery({ queryKey: settingsKeys.company, queryFn: settingsApi.company })
  if (query.isPending) return <QueryStatus />
  if (query.isError) return <QueryStatus error={query.error} onRetry={() => void query.refetch()} />
  return <CompanyForm settings={query.data} />
}

function CompanyForm({ settings }: { settings: CompanySettings }) {
  const queryClient = useQueryClient()
  const [values, setValues] = useState<FormValues>(() => toForm(settings))
  const [needsReauth, setNeedsReauth] = useState(false)
  const [saved, setSaved] = useState(false)

  const save = useMutation({
    mutationFn: (input: CompanySettingsInput) => settingsApi.updateCompany(input),
    onSuccess: (result) => {
      queryClient.setQueryData(settingsKeys.company, result)
      setNeedsReauth(false)
      setSaved(true)
    },
    onError: (error) => {
      // Cambiar datos fiscales (IBAN incluido) exige confirmar el 2FA.
      if (error instanceof ApiError && error.code === 'ReauthRequired') setNeedsReauth(true)
    },
  })

  const apiError =
    save.error instanceof ApiError && save.error.code !== 'ReauthRequired' ? save.error : null
  const fieldErrors = apiError?.fieldErrors ?? {}

  useEffect(() => {
    if (!apiError) return
    const firstInvalid = document.querySelector<HTMLElement>('form [aria-invalid="true"]')
    firstInvalid?.focus()
    firstInvalid?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [apiError])

  function field(key: TextKey | 'paymentTermDays') {
    return {
      name: key,
      value: values[key],
      error: fieldErrors[key],
      onChange: (e: { target: { value: string } }) => {
        setSaved(false)
        setValues((prev) => ({ ...prev, [key]: e.target.value }))
      },
    }
  }

  function payload(): CompanySettingsInput {
    const { paymentTermDays, ...text } = values
    return { ...text, paymentTermDays: Number(paymentTermDays) } as unknown as CompanySettingsInput
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    save.mutate(payload())
  }

  const missing = (save.data ?? settings).missingForInvoicing

  const form = (
    <form onSubmit={onSubmit} className="flex flex-col gap-14" noValidate>
      <PageHeader
        eyebrow="Cuenta"
        title="Datos de la empresa"
        description="Aparecen como emisor en cada factura. Se copian al emitirla: cambiarlos después no altera las facturas ya emitidas."
      />

      {missing.length > 0 ? (
        <Notice>Para emitir facturas falta: {missing.join(', ')}.</Notice>
      ) : (
        <Notice tone="info">Datos completos: ya puedes emitir facturas.</Notice>
      )}
      {apiError && <Notice>{apiError.issues.length > 0 ? 'Revisa los campos marcados.' : apiError.message}</Notice>}

      <section className="flex flex-col gap-8">
        <Eyebrow>Datos fiscales</Eyebrow>
        <div className="grid gap-8 md:grid-cols-2">
          <TextField label="Razón social" autoComplete="organization" {...field('legalName')} />
          <TextField label="Nombre comercial" optional {...field('tradeName')} />
          <TextField label="NIF / CIF" autoCapitalize="characters" spellCheck={false} {...field('taxId')} />
          <SelectField label="País" options={COUNTRY_OPTIONS} {...field('country')} />
          <div className="md:col-span-2">
            <TextField label="Dirección fiscal" {...field('addressLine')} />
          </div>
          <TextField label="Código postal" inputMode="numeric" {...field('postalCode')} />
          <TextField label="Ciudad" {...field('city')} />
          <TextField label="Provincia" optional {...field('province')} />
        </div>
      </section>

      <section className="flex flex-col gap-8">
        <Eyebrow>Contacto y cobro</Eyebrow>
        <div className="grid gap-8 md:grid-cols-2">
          <TextField label="Email de facturación" type="email" optional {...field('email')} />
          <TextField label="Teléfono" type="tel" optional {...field('phone')} />
          <TextField
            label="IBAN para cobrar"
            hint="Se imprime en las facturas. Cambiarlo te pedirá tu código de verificación."
            optional
            autoCapitalize="characters"
            spellCheck={false}
            inputClassName="tabular-nums"
            {...field('iban')}
          />
          <TextField
            label="Plazo de pago (días)"
            hint="Para calcular el vencimiento si no indicas uno."
            inputMode="numeric"
            {...field('paymentTermDays')}
          />
        </div>
      </section>

      <section className="flex flex-col gap-8">
        <Eyebrow>Pie de factura</Eyebrow>
        <TextAreaField
          label="Texto legal"
          hint="Por ejemplo: inscripción en el Registro Mercantil o la cláusula de protección de datos."
          optional
          {...field('invoiceFooter')}
        />
      </section>

      {!needsReauth && (
        <div className="flex items-center justify-end gap-8 border-t border-hodex-line pt-8">
          {saved && <span className="text-small text-hodex-gray">Guardado.</span>}
          <Button type="submit" variant="primary" loading={save.isPending} loadingLabel="Guardando…">
            Guardar datos
          </Button>
        </div>
      )}
    </form>
  )

  // El aviso de 2FA es su propio <form>: va FUERA del formulario de datos
  // (los formularios anidados no son HTML válido).
  return (
    <div className="flex flex-col gap-8">
      {form}
      {needsReauth && (
        <div className="flex justify-end border-t border-hodex-line pt-8">
          <ReauthPrompt onConfirmed={() => save.mutate(payload())} onCancel={() => setNeedsReauth(false)} />
        </div>
      )}
    </div>
  )
}
