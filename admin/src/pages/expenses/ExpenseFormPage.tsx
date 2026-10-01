import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { attachmentsApi, type Attachment, type ExpenseSuggestion } from '../../api/attachments'
import { ApiError } from '../../api/client'
import { contactKeys, contactsApi } from '../../api/contacts'
import { dashboardKeys } from '../../api/dashboard'
import { inboxKeys } from '../../api/inbox'
import {
  EXPENSE_CATEGORIES,
  expenseKeys,
  expensesApi,
  IRPF_RATES,
  type Expense,
  type ExpenseCategory,
  type ExpenseInput,
} from '../../api/expenses'
import { Button } from '../../components/Button'
import { CheckboxField, SelectField, TextAreaField, TextField } from '../../components/fields'
import { QueryStatus } from '../../components/lists'
import { Notice } from '../../components/Notice'
import { PageHeader } from '../../components/PageHeader'
import { breakdownFromTotal, centsToInput, formatCents, parseAmountToCents } from '../../lib/money'
import { useSession } from '../../auth/useAuth'
import { todayInSpain } from '../../lib/periods'
import { ReceiptPanel } from './ReceiptPanel'

/** IVA incluido en lo pagado (lo que pone el ticket), del más habitual al menos. */
const VAT_INCLUDED_OPTIONS = [
  { value: '2100', label: 'IVA 21 % incluido' },
  { value: '1000', label: 'IVA 10 % incluido' },
  { value: '400', label: 'IVA 4 % incluido' },
  { value: '0', label: 'Sin IVA' },
]

interface FormValues {
  /** Lo pagado, IVA incluido: lo que pone el ticket o la factura. */
  amount: string
  description: string
  category: ExpenseCategory
  issueDate: string
  vatRateBp: string
  // ─ Más detalles ─
  supplierId: string
  invoiceNumber: string
  irpfRateBp: string
  vatDeductible: boolean
  paid: boolean
  paidOn: string
  notes: string
}

function initialValues(expense?: Expense): FormValues {
  if (!expense) {
    return {
      amount: '',
      description: '',
      category: 'other',
      issueDate: todayInSpain(),
      vatRateBp: '2100',
      supplierId: '',
      invoiceNumber: '',
      irpfRateBp: '0',
      vatDeductible: true,
      paid: true, // Un gasto rápido casi siempre está ya pagado.
      paidOn: todayInSpain(),
      notes: '',
    }
  }
  return {
    amount: centsToInput(expense.totalCents),
    description: expense.description,
    category: expense.category,
    issueDate: expense.issueDate,
    vatRateBp: String(expense.vatRateBp),
    supplierId: expense.supplierId ?? '',
    invoiceNumber: expense.invoiceNumber ?? '',
    irpfRateBp: String(expense.irpfRateBp),
    vatDeductible: expense.vatDeductible,
    paid: expense.paidOn !== null,
    paidOn: expense.paidOn ?? todayInSpain(),
    notes: expense.notes ?? '',
  }
}

/** ¿Tiene datos en "Más detalles"? Entonces se muestran abiertos al editar. */
function hasDetails(expense?: Expense): boolean {
  return Boolean(
    expense &&
      (expense.supplierId || expense.invoiceNumber || expense.irpfRateBp > 0 || !expense.vatDeductible || expense.notes),
  )
}

/** Alta (`/gastos/nuevo`) y edición (`/gastos/:id/editar`). */
export function ExpenseFormPage() {
  const { id } = useParams()
  const existing = useQuery({
    queryKey: expenseKeys.detail(id ?? ''),
    queryFn: () => expensesApi.get(id!),
    enabled: Boolean(id),
  })

  // Gasto nuevo a partir de un justificante recibido por email (?adjunto=<id>).
  const [search] = useSearchParams()
  const attachmentId = id ? null : search.get('adjunto')
  const initial = useQuery({
    queryKey: ['attachments', attachmentId],
    queryFn: () => attachmentsApi.get(attachmentId!),
    enabled: Boolean(attachmentId),
  })

  if (id && existing.isPending) return <QueryStatus />
  if (id && existing.isError) return <QueryStatus error={existing.error} />
  if (attachmentId && initial.isPending) return <QueryStatus />
  if (attachmentId && initial.isError) return <QueryStatus error={initial.error} />
  return <ExpenseForm key={id ?? attachmentId ?? 'new'} expense={existing.data} initialAttachment={initial.data} />
}

function ExpenseForm({ expense, initialAttachment }: { expense?: Expense; initialAttachment?: Attachment }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [values, setValues] = useState<FormValues>(() => initialValues(expense))
  const [showDetails, setShowDetails] = useState(() => hasDetails(expense))
  const [amountError, setAmountError] = useState<string | null>(null)
  const [attachmentIds, setAttachmentIds] = useState<string[]>(() => (initialAttachment ? [initialAttachment.id] : []))
  const { features } = useSession()
  const isEdit = Boolean(expense)

  // Proveedores activos para el desplegable de "Más detalles".
  const suppliers = useQuery({
    queryKey: contactKeys.list({ role: 'supplier', status: 'active', pageSize: 100 }),
    queryFn: () => contactsApi.list({ role: 'supplier', status: 'active', pageSize: 100 }),
    enabled: showDetails || Boolean(expense?.supplierId),
  })
  const supplierOptions = [
    { value: '', label: 'Sin proveedor' },
    ...(suppliers.data?.items ?? []).map((s) => ({ value: s.id, label: s.legalName })),
  ]
  if (expense?.supplier && !supplierOptions.some((o) => o.value === expense.supplier!.id)) {
    supplierOptions.push({ value: expense.supplier.id, label: `${expense.supplier.legalName} (archivado)` })
  }

  const save = useMutation({
    mutationFn: (input: ExpenseInput) => (expense ? expensesApi.update(expense.id, input) : expensesApi.create(input)),
    onSuccess: (saved) => {
      queryClient.setQueryData(expenseKeys.detail(saved.id), saved)
      void queryClient.invalidateQueries({ queryKey: expenseKeys.all })
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.all })
      void queryClient.invalidateQueries({ queryKey: inboxKeys.all })
      navigate(`/gastos/${saved.id}`, { replace: isEdit })
    },
  })

  const apiError = save.error instanceof ApiError ? save.error : null
  const fieldErrors: Record<string, string | undefined> = { ...apiError?.fieldErrors }
  if (amountError) fieldErrors.totalCents = amountError

  // Si hay un error en un campo de "Más detalles", se muestra desplegado.
  const detailFields = ['supplierId', 'invoiceNumber', 'irpfRateBp', 'paidOn', 'notes']
  const detailsOpen = showDetails || detailFields.some((f) => fieldErrors[f])

  useEffect(() => {
    if (!save.error && !amountError) return
    const firstInvalid = document.querySelector<HTMLElement>('form [aria-invalid="true"]')
    firstInvalid?.focus()
    firstInvalid?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [save.error, amountError])

  function set<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  /** Vuelca lo leído por la IA en el formulario; lo que no se leyó se queda como está. */
  function applySuggestion(s: ExpenseSuggestion) {
    setValues((prev) => ({
      ...prev,
      amount: s.totalCents !== null ? centsToInput(s.totalCents) : prev.amount,
      vatRateBp: s.vatRateBp !== null ? String(s.vatRateBp) : prev.vatRateBp,
      irpfRateBp: s.irpfRateBp !== null ? String(s.irpfRateBp) : prev.irpfRateBp,
      description: s.description ?? prev.description,
      category: s.category ?? prev.category,
      issueDate: s.issueDate ?? prev.issueDate,
      // Un ticket se paga el día que se emite.
      paidOn: !isEdit && s.issueDate ? s.issueDate : prev.paidOn,
      invoiceNumber: s.invoiceNumber ?? prev.invoiceNumber,
      supplierId: s.supplierId ?? prev.supplierId,
    }))
    setAmountError(null)
    if (s.supplierId || s.invoiceNumber || (s.irpfRateBp ?? 0) > 0) setShowDetails(true)
  }

  // Desglose en vivo (el que cuenta lo calcula el servidor con la misma regla).
  const totalCents = parseAmountToCents(values.amount)
  const preview =
    totalCents && totalCents !== 0
      ? breakdownFromTotal(totalCents, Number(values.vatRateBp), Number(values.irpfRateBp))
      : null

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (totalCents === null || totalCents === 0) {
      setAmountError(values.amount ? 'Importe no válido (p. ej. 13 o 13,50)' : 'Indica cuánto has pagado')
      return
    }
    setAmountError(null)
    save.mutate({
      totalCents,
      description: values.description,
      category: values.category,
      issueDate: values.issueDate,
      vatRateBp: Number(values.vatRateBp),
      supplierId: values.supplierId || null,
      invoiceNumber: values.invoiceNumber,
      irpfRateBp: Number(values.irpfRateBp),
      vatDeductible: values.vatDeductible,
      paidOn: values.paid ? values.paidOn : null,
      notes: values.notes,
      attachmentIds,
    })
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-[880px] flex-col gap-12" noValidate>
      <PageHeader
        eyebrow={isEdit ? 'Editar gasto' : 'Nuevo gasto'}
        title={isEdit ? expense!.description : 'Nuevo gasto'}
        description={
          isEdit
            ? undefined
            : features.aiReading
              ? 'Sube el ticket y se rellena solo, o escribe lo que has pagado. El IVA se calcula solo.'
              : 'Lo que has pagado y en qué. El IVA se calcula solo.'
        }
      />

      {apiError && (
        <Notice>{apiError.issues.length > 0 ? 'Revisa los campos marcados antes de guardar.' : apiError.message}</Notice>
      )}

      <ReceiptPanel
        initial={initialAttachment}
        aiEnabled={features.aiReading}
        autoApply={!isEdit}
        onChange={setAttachmentIds}
        onSuggestion={applySuggestion}
      />

      {/* ─── Lo esencial ─── */}
      <section className="flex flex-col gap-8">
        <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-end">
          <TextField
            label="Importe pagado (€)"
            name="totalCents"
            inputMode="decimal"
            placeholder="0,00"
            autoFocus={!isEdit}
            value={values.amount}
            error={fieldErrors.totalCents ?? fieldErrors.baseCents}
            onChange={(e) => {
              set('amount', e.target.value)
              setAmountError(null)
            }}
            inputClassName="font-display text-h2 font-extralight tabular-nums"
          />
          <SelectField
            label="IVA"
            name="vatRateBp"
            options={VAT_INCLUDED_OPTIONS}
            value={values.vatRateBp}
            error={fieldErrors.vatRateBp}
            onChange={(e) => set('vatRateBp', e.target.value)}
          />
        </div>
        <p aria-live="polite" className="-mt-4 text-small text-hodex-gray tabular-nums">
          {preview
            ? `Base ${formatCents(preview.baseCents)} + IVA ${formatCents(preview.vatCents)}${
                preview.irpfCents ? ` − retención ${formatCents(preview.irpfCents)}` : ''
              }`
            : 'Escribe lo que pone el ticket o la factura, con el IVA incluido.'}
        </p>

        <TextField
          label="Concepto"
          name="description"
          placeholder="Qué has comprado o pagado"
          value={values.description}
          error={fieldErrors.description}
          onChange={(e) => set('description', e.target.value)}
        />
        <div className="grid gap-8 md:grid-cols-2">
          <SelectField
            label="Categoría"
            name="category"
            options={Object.entries(EXPENSE_CATEGORIES).map(([value, label]) => ({ value, label }))}
            value={values.category}
            error={fieldErrors.category}
            onChange={(e) => set('category', e.target.value as ExpenseCategory)}
          />
          <TextField
            label="Fecha"
            type="date"
            name="issueDate"
            value={values.issueDate}
            error={fieldErrors.issueDate}
            onChange={(e) => set('issueDate', e.target.value)}
          />
        </div>
      </section>

      {/* ─── Más detalles (plegado) ─── */}
      <section className="border-t border-hodex-line">
        <button
          type="button"
          aria-expanded={detailsOpen}
          aria-controls="mas-detalles"
          onClick={() => setShowDetails(!detailsOpen)}
          className="flex w-full items-center justify-between py-5 text-left"
        >
          <span className="flex flex-col">
            <span className="text-eyebrow uppercase tracking-eyebrow text-hodex-gray">Más detalles</span>
            <span className="text-small text-hodex-gray-light">
              Proveedor, nº de factura, retención, deducibilidad, pago y notas
            </span>
          </span>
          <span
            aria-hidden="true"
            className={`text-hodex-black transition-transform duration-300 ${detailsOpen ? 'rotate-90' : ''}`}
          >
            ↳
          </span>
        </button>

        <div id="mas-detalles" hidden={!detailsOpen} className="flex flex-col gap-8 pb-4">
          <div className="grid gap-8 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <SelectField
                label="Proveedor"
                name="supplierId"
                options={supplierOptions}
                value={values.supplierId}
                error={fieldErrors.supplierId}
                onChange={(e) => set('supplierId', e.target.value)}
              />
              <Link
                to="/clientes/nuevo"
                className="self-start text-small text-hodex-gray underline-offset-4 hover:text-hodex-black hover:underline"
              >
                + Dar de alta un proveedor
              </Link>
            </div>
            <TextField
              label="Nº de factura"
              name="invoiceNumber"
              optional
              value={values.invoiceNumber}
              error={fieldErrors.invoiceNumber}
              onChange={(e) => set('invoiceNumber', e.target.value)}
            />
            <SelectField
              label="Retención IRPF"
              name="irpfRateBp"
              hint="Solo en facturas de profesionales o alquileres."
              options={IRPF_RATES.map((r) => ({ value: String(r.value), label: r.label }))}
              value={values.irpfRateBp}
              error={fieldErrors.irpfRateBp}
              onChange={(e) => set('irpfRateBp', e.target.value)}
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <CheckboxField
              label="Pagado"
              description="Desmárcalo si es una factura que aún tienes que pagar."
              checked={values.paid}
              onChange={(e) => set('paid', e.target.checked)}
            />
            <CheckboxField
              label="IVA deducible"
              description="Desmárcalo si el IVA de este gasto no se puede deducir."
              checked={values.vatDeductible}
              onChange={(e) => set('vatDeductible', e.target.checked)}
            />
          </div>
          {values.paid && (
            <div className="md:max-w-[calc(50%-1rem)]">
              <TextField
                label="Fecha de pago"
                type="date"
                name="paidOn"
                value={values.paidOn}
                error={fieldErrors.paidOn}
                onChange={(e) => set('paidOn', e.target.value)}
              />
            </div>
          )}
          <TextAreaField
            label="Notas internas"
            name="notes"
            optional
            value={values.notes}
            error={fieldErrors.notes}
            onChange={(e) => set('notes', e.target.value)}
          />
        </div>
      </section>

      <div className="flex flex-col-reverse gap-4 border-t border-hodex-line pt-8 sm:flex-row sm:items-center sm:justify-end sm:gap-8">
        <Link
          to={isEdit ? `/gastos/${expense!.id}` : '/gastos'}
          className="text-center text-small text-hodex-gray underline-offset-4 transition-colors hover:text-hodex-black hover:underline"
        >
          Cancelar
        </Link>
        <Button type="submit" variant="primary" loading={save.isPending} loadingLabel="Guardando…">
          {isEdit ? 'Guardar cambios' : 'Guardar gasto'}
        </Button>
      </div>
    </form>
  )
}
