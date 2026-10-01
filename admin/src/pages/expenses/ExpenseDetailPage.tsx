import { useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { EXPENSE_CATEGORIES, expenseKeys, expensesApi, type Expense } from '../../api/expenses'
import { Eyebrow } from '../../components/brand'
import { Button, LinkButton } from '../../components/Button'
import { QueryStatus } from '../../components/lists'
import { Notice } from '../../components/Notice'
import { PageHeader } from '../../components/PageHeader'
import { ReauthPrompt } from '../../components/ReauthPrompt'
import { formatDateTime } from '../../lib/format'
import { formatCents, formatRate } from '../../lib/money'
import { formatShortDate } from '../../lib/periods'

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-hodex-line py-5 sm:flex-row sm:items-baseline sm:gap-8">
      <dt className="w-48 shrink-0 text-small text-hodex-gray">{label}</dt>
      <dd className="min-w-0 break-words">{children ?? <span className="text-hodex-gray-light">—</span>}</dd>
    </div>
  )
}

export function ExpenseDetailPage() {
  const { id = '' } = useParams()
  const query = useQuery({ queryKey: expenseKeys.detail(id), queryFn: () => expensesApi.get(id) })

  if (query.isPending) return <QueryStatus />
  if (query.isError) return <QueryStatus error={query.error} onRetry={() => void query.refetch()} />
  return <ExpenseDetail expense={query.data} />
}

type DeleteStep = 'idle' | 'confirm' | 'reauth'

function ExpenseDetail({ expense }: { expense: Expense }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [step, setStep] = useState<DeleteStep>('idle')

  const remove = useMutation({
    mutationFn: () => expensesApi.remove(expense.id),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: expenseKeys.detail(expense.id) })
      void queryClient.invalidateQueries({ queryKey: expenseKeys.all })
      navigate('/gastos', { replace: true })
    },
    onError: (error) => {
      // El backend pide confirmar el 2FA: se pide y se reintenta.
      if (error instanceof ApiError && error.code === 'ReauthRequired') setStep('reauth')
    },
  })

  const removeError =
    remove.error && !(remove.error instanceof ApiError && remove.error.code === 'ReauthRequired')
      ? remove.error
      : null

  return (
    <div className="flex flex-col gap-14">
      <PageHeader
        eyebrow={EXPENSE_CATEGORIES[expense.category]}
        title={expense.description}
        description={
          <>
            {expense.supplier ? (
              <Link to={`/clientes/${expense.supplier.id}`} className="underline-offset-4 hover:text-hodex-black hover:underline">
                {expense.supplier.legalName}
              </Link>
            ) : (
              'Sin proveedor'
            )}{' '}
            · {formatShortDate(expense.issueDate)}
          </>
        }
        actions={
          <LinkButton to={`/gastos/${expense.id}/editar`} variant="dark">
            Editar
          </LinkButton>
        }
      />

      <dl className="grid gap-px border border-hodex-line bg-hodex-line sm:grid-cols-4">
        {[
          ['Base', expense.baseCents],
          [`IVA ${formatRate(expense.vatRateBp)}`, expense.vatCents],
          [`Retención ${formatRate(expense.irpfRateBp)}`, -expense.irpfCents],
          ['Total', expense.totalCents],
        ].map(([label, cents]) => (
          <div key={label as string} className="flex flex-col gap-2 bg-hodex-white p-6">
            <dt className="text-eyebrow uppercase tracking-eyebrow text-hodex-gray">{label}</dt>
            <dd className="font-display text-h3 leading-tight font-extralight tabular-nums">
              {formatCents(cents as number)}
            </dd>
          </div>
        ))}
      </dl>

      <section className="flex flex-col gap-6">
        <Eyebrow>Detalle</Eyebrow>
        <dl className="border-t border-hodex-line">
          <Row label="Nº de factura">{expense.invoiceNumber}</Row>
          <Row label="Fecha de la factura">{formatShortDate(expense.issueDate)}</Row>
          <Row label="Estado">{expense.paidOn ? `Pagado el ${formatShortDate(expense.paidOn)}` : 'Pendiente de pago'}</Row>
          <Row label="IVA deducible">{expense.vatDeductible ? 'Sí' : 'No'}</Row>
          <Row label="Proveedor (NIF)">{expense.supplier?.taxId}</Row>
          <Row label="Notas">{expense.notes && <span className="whitespace-pre-line">{expense.notes}</span>}</Row>
        </dl>
      </section>

      <section className="flex flex-col gap-6">
        <Eyebrow>Eliminar</Eyebrow>
        <div className="flex flex-col items-start gap-5">
          <p className="max-w-[640px] text-hodex-gray">
            Se retira de listados y totales. Por trazabilidad contable no se borra físicamente y la
            acción queda registrada. Te pediremos tu código de verificación.
          </p>
          {step === 'idle' && (
            <Button variant="outline" onClick={() => setStep('confirm')}>
              Eliminar gasto
            </Button>
          )}
          {step === 'confirm' && (
            <div className="flex flex-wrap items-center gap-6">
              <Button variant="outline" loading={remove.isPending} loadingLabel="Eliminando…" onClick={() => remove.mutate()}>
                Sí, eliminar
              </Button>
              <button
                type="button"
                onClick={() => setStep('idle')}
                className="text-small text-hodex-gray underline-offset-4 hover:text-hodex-black hover:underline"
              >
                Cancelar
              </button>
            </div>
          )}
          {step === 'reauth' && (
            <ReauthPrompt onConfirmed={() => remove.mutate()} onCancel={() => setStep('idle')} />
          )}
          {removeError && (
            <Notice>{removeError instanceof ApiError ? removeError.message : 'No se pudo eliminar.'}</Notice>
          )}
        </div>
      </section>

      <p className="text-small text-hodex-gray-light">
        Registrado: {formatDateTime(expense.createdAt)} · Última modificación: {formatDateTime(expense.updatedAt)}
      </p>
    </div>
  )
}
