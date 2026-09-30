import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { contactKeys, contactsApi } from '../../api/contacts'
import { dashboardKeys } from '../../api/dashboard'
import { IRPF_RATES, VAT_RATES } from '../../api/expenses'
import { invoiceKeys, invoicesApi, type Invoice, type InvoiceDraftInput } from '../../api/invoices'
import { Eyebrow } from '../../components/brand'
import { Button } from '../../components/Button'
import { SelectField, TextAreaField, TextField } from '../../components/fields'
import { QueryStatus } from '../../components/lists'
import { Notice } from '../../components/Notice'
import { PageHeader } from '../../components/PageHeader'
import { computeInvoiceTotals } from '../../lib/invoiceMath'
import {
  centsToInput,
  formatCents,
  formatRate,
  milliToInput,
  multiplyQuantity,
  parseAmountToCents,
  parseQuantityToMilli,
} from '../../lib/money'
import { todayInSpain } from '../../lib/periods'

interface LineValues {
  key: string
  description: string
  quantity: string
  unitPrice: string
  vatRateBp: string
}

interface FormValues {
  clientId: string
  issueDate: string
  dueDate: string
  irpfRateBp: string
  notes: string
  internalNotes: string
  lines: LineValues[]
}

const newLine = (): LineValues => ({
  key: crypto.randomUUID(),
  description: '',
  quantity: '1',
  unitPrice: '',
  vatRateBp: '2100',
})

function initialValues(invoice?: Invoice): FormValues {
  if (!invoice) {
    return {
      clientId: '',
      issueDate: todayInSpain(),
      dueDate: '',
      irpfRateBp: '0',
      notes: '',
      internalNotes: '',
      lines: [newLine()],
    }
  }
  return {
    clientId: invoice.clientId,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate ?? '',
    irpfRateBp: String(invoice.irpfRateBp),
    notes: invoice.notes ?? '',
    internalNotes: invoice.internalNotes ?? '',
    lines: invoice.lines.map((line) => ({
      key: line.id,
      description: line.description,
      quantity: milliToInput(line.quantityMilli),
      unitPrice: centsToInput(line.unitPriceCents),
      vatRateBp: String(line.vatRateBp),
    })),
  }
}

/** Nueva factura (`/facturas/nueva`) o edición de un borrador (`/facturas/:id/editar`). */
export function InvoiceEditorPage() {
  const { id } = useParams()
  const existing = useQuery({
    queryKey: invoiceKeys.detail(id ?? ''),
    queryFn: () => invoicesApi.get(id!),
    enabled: Boolean(id),
  })

  if (id && existing.isPending) return <QueryStatus />
  if (id && existing.isError) return <QueryStatus error={existing.error} />
  if (existing.data && existing.data.status !== 'draft') {
    return <Notice>Esta factura ya está emitida y no se puede editar. Crea una rectificativa desde su ficha.</Notice>
  }
  return <InvoiceEditor key={id ?? 'new'} invoice={existing.data} />
}

function InvoiceEditor({ invoice }: { invoice?: Invoice }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [values, setValues] = useState<FormValues>(() => initialValues(invoice))
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({})
  const isRectifying = invoice?.kind === 'rectifying'

  const clients = useQuery({
    queryKey: contactKeys.list({ role: 'client', status: 'active', pageSize: 100 }),
    queryFn: () => contactsApi.list({ role: 'client', status: 'active', pageSize: 100 }),
  })
  const clientOptions = [
    { value: '', label: 'Elige un cliente' },
    ...(clients.data?.items ?? []).map((c) => ({ value: c.id, label: c.legalName })),
  ]
  if (invoice && !clientOptions.some((o) => o.value === invoice.clientId)) {
    clientOptions.push({ value: invoice.clientId, label: invoice.client.legalName })
  }

  const save = useMutation({
    mutationFn: (input: InvoiceDraftInput) => (invoice ? invoicesApi.update(invoice.id, input) : invoicesApi.create(input)),
    onSuccess: (saved) => {
      queryClient.setQueryData(invoiceKeys.detail(saved.id), saved)
      void queryClient.invalidateQueries({ queryKey: invoiceKeys.all })
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.all })
      navigate(`/facturas/${saved.id}`, { replace: Boolean(invoice) })
    },
  })

  // Errores del servidor por campo, incluidas las líneas: "lines.2.unitPriceCents".
  const apiError = save.error instanceof ApiError ? save.error : null
  const errors: Record<string, string> = { ...localErrors }
  for (const issue of apiError?.issues ?? []) {
    const key = issue.path.join('.')
    if (!(key in errors)) errors[key] = issue.message
  }

  useEffect(() => {
    if (!save.error && Object.keys(localErrors).length === 0) return
    const firstInvalid = document.querySelector<HTMLElement>('form [aria-invalid="true"]')
    firstInvalid?.focus()
    firstInvalid?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [save.error, localErrors])

  function set<K extends keyof Omit<FormValues, 'lines'>>(key: K, value: FormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  function setLine(index: number, patch: Partial<LineValues>) {
    setValues((prev) => ({ ...prev, lines: prev.lines.map((line, i) => (i === index ? { ...line, ...patch } : line)) }))
  }

  function removeLine(index: number) {
    setValues((prev) => ({ ...prev, lines: prev.lines.filter((_, i) => i !== index) }))
  }

  // Líneas interpretadas (null si algún número no se entiende todavía).
  const parsedLines = values.lines.map((line) => ({
    quantityMilli: parseQuantityToMilli(line.quantity),
    unitPriceCents: parseAmountToCents(line.unitPrice),
    vatRateBp: Number(line.vatRateBp),
  }))
  const validLines = parsedLines.filter(
    (l): l is { quantityMilli: number; unitPriceCents: number; vatRateBp: number } =>
      l.quantityMilli !== null && l.unitPriceCents !== null,
  )
  const totals = computeInvoiceTotals(validLines, Number(values.irpfRateBp))

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    const problems: Record<string, string> = {}
    values.lines.forEach((_, i) => {
      if (parsedLines[i]!.quantityMilli === null || parsedLines[i]!.quantityMilli === 0) {
        problems[`lines.${i}.quantityMilli`] = 'Cantidad no válida'
      }
      if (parsedLines[i]!.unitPriceCents === null) problems[`lines.${i}.unitPriceCents`] = 'Precio no válido'
    })
    setLocalErrors(problems)
    if (Object.keys(problems).length > 0) return

    save.mutate({
      clientId: values.clientId,
      issueDate: values.issueDate,
      dueDate: values.dueDate || null,
      irpfRateBp: Number(values.irpfRateBp),
      notes: values.notes,
      internalNotes: values.internalNotes,
      lines: values.lines.map((line, i) => ({
        description: line.description,
        quantityMilli: parsedLines[i]!.quantityMilli!,
        unitPriceCents: parsedLines[i]!.unitPriceCents!,
        vatRateBp: Number(line.vatRateBp),
      })),
    })
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-14" noValidate>
      <PageHeader
        eyebrow={isRectifying ? 'Borrador de rectificativa' : invoice ? 'Editar borrador' : 'Nueva factura'}
        title={isRectifying ? `Rectifica ${invoice!.rectifies?.fullNumber}` : invoice ? 'Borrador de factura' : 'Nueva factura'}
        description="Guarda el borrador y revísalo. El número definitivo se asigna al emitir."
      />

      {apiError && <Notice>{apiError.issues.length > 0 ? 'Revisa los campos marcados antes de guardar.' : apiError.message}</Notice>}
      {isRectifying && <Notice tone="info">Motivo: {invoice!.rectificationReason}</Notice>}

      <section className="flex flex-col gap-8">
        <Eyebrow>Cliente y fechas</Eyebrow>
        <div className="grid gap-8 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <SelectField
              label="Cliente"
              name="clientId"
              options={clientOptions}
              value={values.clientId}
              error={errors.clientId}
              disabled={isRectifying}
              onChange={(e) => set('clientId', e.target.value)}
            />
            {!isRectifying && (
              <Link to="/clientes/nuevo" className="self-start text-small text-hodex-gray underline-offset-4 hover:text-hodex-black hover:underline">
                + Dar de alta un cliente
              </Link>
            )}
          </div>
          <SelectField
            label="Retención IRPF"
            name="irpfRateBp"
            options={IRPF_RATES.map((r) => ({ value: String(r.value), label: r.label }))}
            value={values.irpfRateBp}
            error={errors.irpfRateBp}
            onChange={(e) => set('irpfRateBp', e.target.value)}
          />
          <TextField
            label="Fecha de la factura"
            type="date"
            name="issueDate"
            value={values.issueDate}
            error={errors.issueDate}
            onChange={(e) => set('issueDate', e.target.value)}
          />
          <TextField
            label="Vencimiento"
            type="date"
            name="dueDate"
            optional
            hint="Si lo dejas vacío, se calcula con tu plazo de pago al emitir."
            value={values.dueDate}
            error={errors.dueDate}
            onChange={(e) => set('dueDate', e.target.value)}
          />
        </div>
      </section>

      <section className="flex flex-col gap-6">
        <Eyebrow>Conceptos</Eyebrow>
        {errors.lines && <p className="text-small font-medium">— {errors.lines}</p>}
        <ol className="flex flex-col border-t border-hodex-line">
          {values.lines.map((line, i) => (
            <li
              key={line.key}
              className="grid gap-4 border-b border-hodex-line py-6 md:grid-cols-[minmax(0,3fr)_5.5rem_8rem_9rem_7rem_auto] md:items-end"
            >
              <TextField
                label={`Concepto ${i + 1}`}
                name={`lines.${i}.description`}
                value={line.description}
                error={errors[`lines.${i}.description`]}
                onChange={(e) => setLine(i, { description: e.target.value })}
              />
              <TextField
                label="Cantidad"
                name={`lines.${i}.quantityMilli`}
                inputMode="decimal"
                value={line.quantity}
                error={errors[`lines.${i}.quantityMilli`]}
                onChange={(e) => setLine(i, { quantity: e.target.value })}
                inputClassName="tabular-nums"
              />
              <TextField
                label="Precio (€)"
                name={`lines.${i}.unitPriceCents`}
                inputMode="decimal"
                placeholder="0,00"
                value={line.unitPrice}
                error={errors[`lines.${i}.unitPriceCents`]}
                onChange={(e) => setLine(i, { unitPrice: e.target.value })}
                inputClassName="tabular-nums"
              />
              <SelectField
                label="IVA"
                name={`lines.${i}.vatRateBp`}
                options={VAT_RATES.map((r) => ({ value: String(r.value), label: formatRate(r.value) }))}
                value={line.vatRateBp}
                onChange={(e) => setLine(i, { vatRateBp: e.target.value })}
              />
              <div className="flex flex-col gap-1 md:items-end">
                <span className="text-small text-hodex-gray">Importe</span>
                <span className="py-3 tabular-nums">
                  {parsedLines[i]!.quantityMilli !== null && parsedLines[i]!.unitPriceCents !== null
                    ? formatCents(multiplyQuantity(parsedLines[i]!.unitPriceCents!, parsedLines[i]!.quantityMilli!))
                    : '—'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => removeLine(i)}
                disabled={values.lines.length === 1}
                aria-label={`Quitar concepto ${i + 1}`}
                className="self-end py-3 text-small text-hodex-gray underline-offset-4 hover:text-hodex-black hover:underline disabled:invisible"
              >
                Quitar
              </button>
            </li>
          ))}
        </ol>
        <button
          type="button"
          onClick={() => setValues((prev) => ({ ...prev, lines: [...prev.lines, newLine()] }))}
          className="self-start text-small text-hodex-black underline-offset-4 hover:underline"
        >
          + Añadir concepto
        </button>

        <dl aria-live="polite" className="ml-auto flex w-full flex-col text-small md:w-[360px]">
          <div className="flex justify-between border-b border-hodex-line py-2">
            <dt className="text-hodex-gray">Base imponible</dt>
            <dd className="tabular-nums">{formatCents(totals.baseCents)}</dd>
          </div>
          {totals.vatBreakdown.map((group) => (
            <div key={group.rateBp} className="flex justify-between border-b border-hodex-line py-2">
              <dt className="text-hodex-gray">IVA {formatRate(group.rateBp)}</dt>
              <dd className="tabular-nums">{formatCents(group.vatCents)}</dd>
            </div>
          ))}
          {totals.irpfCents !== 0 && (
            <div className="flex justify-between border-b border-hodex-line py-2">
              <dt className="text-hodex-gray">Retención IRPF</dt>
              <dd className="tabular-nums">{formatCents(-totals.irpfCents)}</dd>
            </div>
          )}
          <div className="flex items-baseline justify-between pt-4">
            <dt className="text-eyebrow uppercase tracking-eyebrow text-hodex-gray">Total</dt>
            <dd className="font-display text-h3 leading-tight font-light tabular-nums">{formatCents(totals.totalCents)}</dd>
          </div>
        </dl>
      </section>

      <section className="flex flex-col gap-8">
        <Eyebrow>Notas</Eyebrow>
        <div className="grid gap-8 md:grid-cols-2">
          <TextAreaField
            label="Nota en la factura"
            hint="Se imprime en la factura (p. ej. condiciones o agradecimiento)."
            optional
            name="notes"
            value={values.notes}
            error={errors.notes}
            onChange={(e) => set('notes', e.target.value)}
          />
          <TextAreaField
            label="Nota interna"
            hint="Solo la ves tú; no aparece en la factura."
            optional
            name="internalNotes"
            value={values.internalNotes}
            error={errors.internalNotes}
            onChange={(e) => set('internalNotes', e.target.value)}
          />
        </div>
      </section>

      <div className="flex flex-col-reverse gap-4 border-t border-hodex-line pt-8 sm:flex-row sm:items-center sm:justify-end sm:gap-8">
        <Link
          to={invoice ? `/facturas/${invoice.id}` : '/facturas'}
          className="text-center text-small text-hodex-gray underline-offset-4 hover:text-hodex-black hover:underline"
        >
          Cancelar
        </Link>
        <Button type="submit" variant="primary" loading={save.isPending} loadingLabel="Guardando…">
          Guardar borrador
        </Button>
      </div>
    </form>
  )
}
