import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { contactKeys, contactsApi } from '../../api/contacts'
import {
  EXPENSE_CATEGORIES,
  expenseKeys,
  expensesApi,
  IRPF_RATES,
  VAT_RATES,
  type Expense,
  type ExpenseCategory,
  type ExpenseInput,
} from '../../api/expenses'
import { Eyebrow } from '../../components/brand'
import { Button } from '../../components/Button'
import { CheckboxField, SelectField, TextAreaField, TextField } from '../../components/fields'
import { QueryStatus } from '../../components/lists'
import { Notice } from '../../components/Notice'
import { PageHeader } from '../../components/PageHeader'
import { applyRate, centsToInput, formatCents, parseAmountToCents } from '../../lib/money'
import { todayInSpain } from '../../lib/periods'

interface FormValues {
  supplierId: string
  issueDate: string
  invoiceNumber: string
  description: string
  category: ExpenseCategory | ''
  amount: string
  vatRateBp: string
  irpfRateBp: string
  vatDeductible: boolean
  paid: boolean
  paidOn: string
  notes: string
}

function initialValues(expense?: Expense): FormValues {
  if (!expense) {
    return {
      supplierId: '',
      issueDate: todayInSpain(),
      invoiceNumber: '',
      description: '',
      category: '',
      amount: '',
      vatRateBp: '2100',
      irpfRateBp: '0',
      vatDeductible: true,
      paid: false,
      paidOn: todayInSpain(),
      notes: '',
    }
  }
  return {
    supplierId: expense.supplierId ?? '',
    issueDate: expense.issueDate,
    invoiceNumber: expense.invoiceNumber ?? '',
    description: expense.description,
    category: expense.category,
    amount: centsToInput(expense.baseCents),
    vatRateBp: String(expense.vatRateBp),
    irpfRateBp: String(expense.irpfRateBp),
    vatDeductible: expense.vatDeductible,
    paid: expense.paidOn !== null,
    paidOn: expense.paidOn ?? todayInSpain(),
    notes: expense.notes ?? '',
  }
}

/** Alta (`/gastos/nuevo`) y edición (`/gastos/:id/editar`). */
export function ExpenseFormPage() {
  const { id } = useParams()
  const existing = useQuery({
    queryKey: expenseKeys.detail(id ?? ''),
    queryFn: () => expensesApi.get(id!),
    enabled: Boolean(id),
  })

  if (id && existing.isPending) return <QueryStatus />
  if (id && existing.isError) return <QueryStatus error={existing.error} />
  return <ExpenseForm key={id ?? 'new'} expense={existing.data} />
}

function ExpenseForm({ expense }: { expense?: Expense }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [values, setValues] = useState<FormValues>(() => initialValues(expense))
  const [amountError, setAmountError] = useState<string | null>(null)
  const isEdit = Boolean(expense)

  // Proveedores activos para el desplegable.
  const suppliers = useQuery({
    queryKey: contactKeys.list({ role: 'supplier', status: 'active', pageSize: 100 }),
    queryFn: () => contactsApi.list({ role: 'supplier', status: 'active', pageSize: 100 }),
  })
  const supplierOptions = [
    { value: '', label: 'Sin proveedor (ticket, gasto menor…)' },
    ...(suppliers.data?.items ?? []).map((s) => ({ value: s.id, label: s.legalName })),
  ]
  // Un gasto antiguo puede tener un proveedor ya archivado: se conserva como opción.
  if (expense?.supplier && !supplierOptions.some((o) => o.value === expense.supplier!.id)) {
    supplierOptions.push({ value: expense.supplier.id, label: `${expense.supplier.legalName} (archivado)` })
  }

  const save = useMutation({
    mutationFn: (input: ExpenseInput) =>
      expense ? expensesApi.update(expense.id, input) : expensesApi.create(input),
    onSuccess: (saved) => {
      queryClient.setQueryData(expenseKeys.detail(saved.id), saved)
      void queryClient.invalidateQueries({ queryKey: expenseKeys.all })
      navigate(`/gastos/${saved.id}`, { replace: isEdit })
    },
  })

  const apiError = save.error instanceof ApiError ? save.error : null
  const fieldErrors: Record<string, string | undefined> = { ...apiError?.fieldErrors }
  if (amountError) fieldErrors.baseCents = amountError

  useEffect(() => {
    if (!save.error && !amountError) return
    const firstInvalid = document.querySelector<HTMLElement>('form [aria-invalid="true"]')
    firstInvalid?.focus()
    firstInvalid?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [save.error, amountError])

  function set<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  // Vista previa del desglose (el cálculo que cuenta lo hace el servidor).
  const baseCents = parseAmountToCents(values.amount)
  const preview =
    baseCents === null
      ? null
      : {
          base: baseCents,
          vat: applyRate(baseCents, Number(values.vatRateBp)),
          irpf: applyRate(baseCents, Number(values.irpfRateBp)),
        }

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (baseCents === null || baseCents === 0) {
      setAmountError(values.amount ? 'Importe no válido (p. ej. 1.234,56)' : 'Indica la base imponible')
      return
    }
    setAmountError(null)
    save.mutate({
      supplierId: values.supplierId || null,
      issueDate: values.issueDate,
      invoiceNumber: values.invoiceNumber,
      description: values.description,
      category: values.category as ExpenseCategory,
      baseCents,
      vatRateBp: Number(values.vatRateBp),
      irpfRateBp: Number(values.irpfRateBp),
      vatDeductible: values.vatDeductible,
      paidOn: values.paid ? values.paidOn : null,
      notes: values.notes,
    })
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-14" noValidate>
      <PageHeader
        eyebrow={isEdit ? 'Editar gasto' : 'Nuevo gasto'}
        title={isEdit ? expense!.description : 'Nuevo gasto'}
      />

      {apiError && (
        <Notice>{apiError.issues.length > 0 ? 'Revisa los campos marcados antes de guardar.' : apiError.message}</Notice>
      )}

      <section className="flex flex-col gap-8">
        <Eyebrow>Factura</Eyebrow>
        <div className="grid gap-8 md:grid-cols-2">
          <div className="md:col-span-2">
            <TextField
              label="Concepto"
              name="description"
              placeholder="Qué has comprado o contratado"
              value={values.description}
              error={fieldErrors.description}
              onChange={(e) => set('description', e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <SelectField
              label="Proveedor"
              name="supplierId"
              options={supplierOptions}
              value={values.supplierId}
              error={fieldErrors.supplierId}
              onChange={(e) => set('supplierId', e.target.value)}
            />
            <Link to="/clientes/nuevo" className="self-start text-small text-hodex-gray underline-offset-4 hover:text-hodex-black hover:underline">
              + Dar de alta un proveedor
            </Link>
          </div>
          <SelectField
            label="Categoría"
            name="category"
            options={[
              { value: '', label: 'Elige una categoría' },
              ...Object.entries(EXPENSE_CATEGORIES).map(([value, label]) => ({ value, label })),
            ]}
            value={values.category}
            error={fieldErrors.category}
            onChange={(e) => set('category', e.target.value as ExpenseCategory)}
          />
          <TextField
            label="Fecha de la factura"
            type="date"
            name="issueDate"
            value={values.issueDate}
            error={fieldErrors.issueDate}
            onChange={(e) => set('issueDate', e.target.value)}
          />
          <TextField
            label="Nº de factura"
            name="invoiceNumber"
            optional
            value={values.invoiceNumber}
            error={fieldErrors.invoiceNumber}
            onChange={(e) => set('invoiceNumber', e.target.value)}
          />
        </div>
      </section>

      <section className="flex flex-col gap-8">
        <Eyebrow>Importe</Eyebrow>
        <div className="grid gap-8 md:grid-cols-3">
          <TextField
            label="Base imponible (€)"
            name="baseCents"
            inputMode="decimal"
            placeholder="0,00"
            value={values.amount}
            error={fieldErrors.baseCents}
            onChange={(e) => {
              set('amount', e.target.value)
              setAmountError(null)
            }}
            inputClassName="font-display text-h3 font-extralight tabular-nums"
          />
          <SelectField
            label="IVA"
            name="vatRateBp"
            options={VAT_RATES.map((r) => ({ value: String(r.value), label: r.label }))}
            value={values.vatRateBp}
            error={fieldErrors.vatRateBp}
            onChange={(e) => set('vatRateBp', e.target.value)}
          />
          <SelectField
            label="Retención IRPF"
            name="irpfRateBp"
            options={IRPF_RATES.map((r) => ({ value: String(r.value), label: r.label }))}
            value={values.irpfRateBp}
            error={fieldErrors.irpfRateBp}
            onChange={(e) => set('irpfRateBp', e.target.value)}
          />
        </div>

        <dl aria-live="polite" className="grid gap-px border border-hodex-line bg-hodex-line sm:grid-cols-4">
          {[
            ['Base', preview?.base],
            ['IVA', preview?.vat],
            ['Retención', preview ? -preview.irpf : undefined],
            ['Total a pagar', preview ? preview.base + preview.vat - preview.irpf : undefined],
          ].map(([label, cents]) => (
            <div key={label as string} className="flex flex-col gap-2 bg-hodex-white p-5">
              <dt className="text-eyebrow uppercase tracking-eyebrow text-hodex-gray">{label}</dt>
              <dd className="font-display text-h3 leading-tight font-extralight tabular-nums">
                {cents === undefined ? '—' : formatCents(cents as number)}
              </dd>
            </div>
          ))}
        </dl>

        <div className="grid gap-3 md:grid-cols-2">
          <CheckboxField
            label="IVA deducible"
            description="Desmárcalo si el IVA de este gasto no se puede deducir."
            checked={values.vatDeductible}
            onChange={(e) => set('vatDeductible', e.target.checked)}
          />
          <CheckboxField
            label="Pagado"
            description="Marca si ya has pagado esta factura."
            checked={values.paid}
            onChange={(e) => set('paid', e.target.checked)}
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
      </section>

      <section className="flex flex-col gap-8">
        <Eyebrow>Notas</Eyebrow>
        <TextAreaField
          label="Notas internas"
          name="notes"
          optional
          value={values.notes}
          error={fieldErrors.notes}
          onChange={(e) => set('notes', e.target.value)}
        />
      </section>

      <div className="flex flex-col-reverse gap-4 border-t border-hodex-line pt-8 sm:flex-row sm:items-center sm:justify-end sm:gap-8">
        <Link
          to={isEdit ? `/gastos/${expense!.id}` : '/gastos'}
          className="text-center text-small text-hodex-gray underline-offset-4 transition-colors hover:text-hodex-black hover:underline"
        >
          Cancelar
        </Link>
        <Button type="submit" variant="primary" loading={save.isPending} loadingLabel="Guardando…">
          {isEdit ? 'Guardar cambios' : 'Registrar gasto'}
        </Button>
      </div>
    </form>
  )
}
