import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { contactKeys, contactsApi, type Contact, type ContactInput } from '../../api/contacts'
import { Eyebrow } from '../../components/brand'
import { Button } from '../../components/Button'
import { CheckboxField, SelectField, TextAreaField, TextField } from '../../components/fields'
import { QueryStatus } from '../../components/lists'
import { Notice } from '../../components/Notice'
import { PageHeader } from '../../components/PageHeader'
import { COUNTRY_OPTIONS } from '../../lib/countries'

/** Valores del formulario: todo texto (vacío = sin dato). */
type FormValues = { [K in keyof ContactInput]: ContactInput[K] extends boolean ? boolean : string }

const EMPTY: FormValues = {
  isClient: true,
  isSupplier: false,
  legalName: '',
  tradeName: '',
  taxId: '',
  country: 'ES',
  email: '',
  phone: '',
  addressLine: '',
  postalCode: '',
  city: '',
  province: '',
  notes: '',
}

function toFormValues(contact: Contact): FormValues {
  const values = { ...EMPTY }
  for (const key of Object.keys(EMPTY) as Array<keyof FormValues>) {
    const value = contact[key]
    ;(values as Record<string, unknown>)[key] = value ?? ''
  }
  return values
}

/** Alta (`/clientes/nuevo`) y edición (`/clientes/:id/editar`). */
export function ContactFormPage() {
  const { id } = useParams()
  const existing = useQuery({
    queryKey: contactKeys.detail(id ?? ''),
    queryFn: () => contactsApi.get(id!),
    enabled: Boolean(id),
  })

  if (id && existing.isPending) return <QueryStatus />
  if (id && existing.isError) return <QueryStatus error={existing.error} />
  return <ContactForm key={id ?? 'new'} contact={existing.data} />
}

function ContactForm({ contact }: { contact?: Contact }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [values, setValues] = useState<FormValues>(contact ? toFormValues(contact) : EMPTY)
  const isEdit = Boolean(contact)

  const save = useMutation({
    mutationFn: (input: ContactInput) =>
      contact ? contactsApi.update(contact.id, input) : contactsApi.create(input),
    onSuccess: (saved) => {
      queryClient.setQueryData(contactKeys.detail(saved.id), saved)
      void queryClient.invalidateQueries({ queryKey: contactKeys.all })
      navigate(`/clientes/${saved.id}`, { replace: isEdit })
    },
  })

  const apiError = save.error instanceof ApiError ? save.error : null
  const fieldErrors = apiError?.fieldErrors ?? {}

  // Tras un error de validación, llevar el foco (y la vista) al primer campo marcado.
  useEffect(() => {
    if (!save.error) return
    const firstInvalid = document.querySelector<HTMLElement>('form [aria-invalid="true"]')
    ;(firstInvalid ?? document.querySelector<HTMLElement>('[role="alert"]'))?.focus()
    firstInvalid?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [save.error])

  function set<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  function text(key: Exclude<keyof FormValues, 'isClient' | 'isSupplier'>) {
    return {
      name: key,
      value: values[key],
      error: fieldErrors[key],
      onChange: (e: { target: { value: string } }) => set(key, e.target.value),
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    save.mutate(values as unknown as ContactInput)
  }

  const isSpain = values.country === 'ES'

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-14" noValidate>
      <PageHeader
        eyebrow={isEdit ? 'Editar contacto' : 'Nuevo contacto'}
        title={isEdit ? contact!.legalName : 'Nuevo contacto'}
      />

      {apiError && apiError.issues.length === 0 && <Notice>{apiError.message}</Notice>}
      {apiError && apiError.issues.length > 0 && (
        <Notice>Revisa los campos marcados antes de guardar.</Notice>
      )}

      <section className="flex flex-col gap-8">
        <Eyebrow>Identificación</Eyebrow>
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-3 text-small text-hodex-gray">Tipo de contacto</legend>
          <div className="grid gap-3 md:grid-cols-2">
            <CheckboxField
              label="Cliente"
              description="Le emites facturas."
              checked={values.isClient}
              onChange={(e) => set('isClient', e.target.checked)}
            />
            <CheckboxField
              label="Proveedor"
              description="Te emite facturas (gastos)."
              checked={values.isSupplier}
              onChange={(e) => set('isSupplier', e.target.checked)}
            />
          </div>
          {fieldErrors.isClient && (
            <p className="text-small font-medium text-hodex-black">— {fieldErrors.isClient}</p>
          )}
        </fieldset>
        <div className="grid gap-8 md:grid-cols-2">
          <TextField label="Razón social" autoComplete="organization" {...text('legalName')} />
          <TextField label="Nombre comercial" optional {...text('tradeName')} />
          <SelectField
            label="País"
            options={COUNTRY_OPTIONS}
            {...text('country')}
          />
          <TextField
            label={isSpain ? 'NIF / CIF / NIE' : 'Identificador fiscal (VAT)'}
            hint={isSpain ? 'Se comprueba la letra o el dígito de control.' : undefined}
            optional
            autoCapitalize="characters"
            spellCheck={false}
            {...text('taxId')}
          />
        </div>
      </section>

      <section className="flex flex-col gap-8">
        <Eyebrow>Contacto</Eyebrow>
        <div className="grid gap-8 md:grid-cols-2">
          <TextField label="Email" type="email" optional autoComplete="off" {...text('email')} />
          <TextField label="Teléfono" type="tel" optional {...text('phone')} />
        </div>
      </section>

      <section className="flex flex-col gap-8">
        <Eyebrow>Dirección fiscal</Eyebrow>
        <div className="grid gap-8 md:grid-cols-2">
          <div className="md:col-span-2">
            <TextField label="Dirección" optional {...text('addressLine')} />
          </div>
          <TextField
            label="Código postal"
            optional
            inputMode={isSpain ? 'numeric' : undefined}
            {...text('postalCode')}
          />
          <TextField label="Ciudad" optional {...text('city')} />
          <TextField label="Provincia" optional {...text('province')} />
        </div>
      </section>

      <section className="flex flex-col gap-8">
        <Eyebrow>Notas</Eyebrow>
        <TextAreaField label="Notas internas" optional {...text('notes')} />
      </section>

      <div className="flex flex-col-reverse gap-4 border-t border-hodex-line pt-8 sm:flex-row sm:items-center sm:justify-end sm:gap-8">
        <Link
          to={isEdit ? `/clientes/${contact!.id}` : '/clientes'}
          className="text-center text-small text-hodex-gray underline-offset-4 transition-colors hover:text-hodex-black hover:underline"
        >
          Cancelar
        </Link>
        <Button type="submit" variant="primary" loading={save.isPending} loadingLabel="Guardando…">
          {isEdit ? 'Guardar cambios' : 'Crear contacto'}
        </Button>
      </div>
    </form>
  )
}
