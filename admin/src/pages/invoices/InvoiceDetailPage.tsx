import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { dashboardKeys } from '../../api/dashboard'
import { invoiceKeys, invoicesApi, invoiceState, type Invoice } from '../../api/invoices'
import { settingsApi, settingsKeys } from '../../api/settings'
import { Eyebrow } from '../../components/brand'
import { Button, LinkButton } from '../../components/Button'
import { TextField } from '../../components/fields'
import { InvoiceDocument } from '../../components/InvoiceDocument'
import { QueryStatus } from '../../components/lists'
import { Notice } from '../../components/Notice'
import { PageHeader } from '../../components/PageHeader'
import { formatDateTime } from '../../lib/format'
import { formatCents, formatRate } from '../../lib/money'
import { formatShortDate, todayInSpain } from '../../lib/periods'

const linkClass = 'text-small text-hodex-gray underline-offset-4 hover:text-hodex-black hover:underline'

export function InvoiceDetailPage() {
  const { id = '' } = useParams()
  const query = useQuery({ queryKey: invoiceKeys.detail(id), queryFn: () => invoicesApi.get(id) })
  if (query.isPending) return <QueryStatus />
  if (query.isError) return <QueryStatus error={query.error} onRetry={() => void query.refetch()} />
  return <InvoiceDetail invoice={query.data} />
}

/** Refresca la ficha, los listados y el resumen tras cualquier cambio. */
function useInvoiceUpdated() {
  const queryClient = useQueryClient()
  return (invoice: Invoice) => {
    queryClient.setQueryData(invoiceKeys.detail(invoice.id), invoice)
    void queryClient.invalidateQueries({ queryKey: invoiceKeys.all })
    void queryClient.invalidateQueries({ queryKey: dashboardKeys.all })
  }
}

function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : 'No se pudo completar la acción.'
}

function InvoiceDetail({ invoice }: { invoice: Invoice }) {
  const today = todayInSpain()
  const state = invoiceState(invoice, today)
  const isDraft = invoice.status === 'draft'

  // Un borrador aún no tiene datos congelados: se previsualiza con los actuales.
  const settings = useQuery({ queryKey: settingsKeys.company, queryFn: settingsApi.company, enabled: isDraft })

  const eyebrow = isDraft
    ? invoice.kind === 'rectifying'
      ? 'Borrador de rectificativa'
      : 'Borrador'
    : `${invoice.kind === 'rectifying' ? 'Rectificativa' : 'Factura'} · ${state}`

  return (
    <div className="flex flex-col gap-12">
      <PageHeader
        eyebrow={eyebrow}
        title={invoice.fullNumber ?? 'Borrador de factura'}
        description={`${invoice.clientSnapshot?.legalName ?? invoice.client.legalName} · ${formatCents(invoice.totalCents)}`}
      />

      {isDraft ? <DraftActions invoice={invoice} /> : <IssuedActions invoice={invoice} />}

      {invoice.rectifiedBy.length > 0 && (
        <Notice tone="info">
          Rectificada por{' '}
          {invoice.rectifiedBy.map((r, i) => (
            <span key={r.id}>
              {i > 0 && ', '}
              <Link to={`/facturas/${r.id}`} className="underline underline-offset-4">
                {r.fullNumber ?? 'un borrador'}
              </Link>
            </span>
          ))}
          .
        </Notice>
      )}

      <section className="flex flex-col gap-6">
        <Eyebrow>{isDraft ? 'Vista previa' : 'Factura emitida'}</Eyebrow>
        <InvoiceDocument
          fullNumber={invoice.fullNumber}
          kind={invoice.kind}
          issueDate={invoice.issueDate}
          dueDate={invoice.dueDate}
          issuer={invoice.issuerSnapshot ?? (settings.data?.legalName ? { ...settings.data, legalName: settings.data.legalName } : null)}
          client={invoice.clientSnapshot ?? invoice.client}
          lines={invoice.lines}
          vatBreakdown={invoice.vatBreakdown}
          baseCents={invoice.baseCents}
          irpfRateBp={invoice.irpfRateBp}
          irpfCents={invoice.irpfCents}
          totalCents={invoice.totalCents}
          notes={invoice.notes}
          iban={invoice.issuerSnapshot?.iban ?? settings.data?.iban ?? null}
          footer={isDraft ? (settings.data?.invoiceFooter ?? null) : null}
          rectifies={invoice.rectifies ? { fullNumber: invoice.rectifies.fullNumber, reason: invoice.rectificationReason } : null}
          hash={invoice.hash}
        />
      </section>

      {invoice.internalNotes && (
        <section className="flex flex-col gap-4">
          <Eyebrow>Nota interna</Eyebrow>
          <p className="whitespace-pre-line text-hodex-gray">{invoice.internalNotes}</p>
        </section>
      )}

      <p className="text-small text-hodex-gray-light">
        {invoice.issuedAt ? `Emitida: ${formatDateTime(invoice.issuedAt)}` : `Creada: ${formatDateTime(invoice.createdAt)}`}
      </p>
    </div>
  )
}

// ─── Borrador: emitir, editar, eliminar ─────────────────────────────────────

function DraftActions({ invoice }: { invoice: Invoice }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const onUpdated = useInvoiceUpdated()
  const [step, setStep] = useState<'idle' | 'confirm-issue' | 'confirm-delete'>('idle')

  const issue = useMutation({
    mutationFn: () => invoicesApi.issue(invoice.id),
    onSuccess: (issued) => {
      onUpdated(issued)
      setStep('idle')
    },
  })
  const remove = useMutation({
    mutationFn: () => invoicesApi.remove(invoice.id),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: invoiceKeys.detail(invoice.id) })
      void queryClient.invalidateQueries({ queryKey: invoiceKeys.all })
      navigate('/facturas', { replace: true })
    },
  })

  const problems = issue.error instanceof ApiError && issue.error.code === 'CannotIssue' ? issue.error.issues : []

  return (
    <section className="flex flex-col gap-6">
      {step === 'confirm-issue' ? (
        <div className="flex max-w-[640px] flex-col gap-5 border border-hodex-black bg-hodex-white p-6">
          <span className="text-eyebrow uppercase tracking-eyebrow text-hodex-gray">Emitir factura</span>
          {/* Último vistazo a lo que se va a emitir, antes del paso irreversible. */}
          <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-small">
            <dt className="text-hodex-gray">Cliente</dt>
            <dd>{invoice.client.legalName}</dd>
            <dt className="text-hodex-gray">Fecha</dt>
            <dd>{formatShortDate(invoice.issueDate)}</dd>
            <dt className="text-hodex-gray">Base · IVA</dt>
            <dd className="tabular-nums">
              {formatCents(invoice.baseCents)} · {formatCents(invoice.vatCents)}
            </dd>
            <dt className="text-hodex-gray">Retención IRPF</dt>
            <dd className="tabular-nums">
              {invoice.irpfRateBp > 0 ? `${formatRate(invoice.irpfRateBp)} · ${formatCents(-invoice.irpfCents)}` : 'Sin retención'}
            </dd>
            <dt className="text-hodex-gray">Total</dt>
            <dd className="font-medium tabular-nums">{formatCents(invoice.totalCents)}</dd>
          </dl>
          <p>
            Recibirá su <b className="font-medium">número definitivo</b> y ya{' '}
            <b className="font-medium">no se podrá modificar ni eliminar</b>. Si después hay un error, se corrige con una
            factura rectificativa.
          </p>
          <div className="flex flex-wrap items-center gap-6">
            <Button variant="primary" loading={issue.isPending} loadingLabel="Emitiendo…" onClick={() => issue.mutate()}>
              Sí, emitir
            </Button>
            <button type="button" className={linkClass} onClick={() => setStep('idle')}>
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-6">
          <Button variant="primary" onClick={() => setStep('confirm-issue')}>
            Emitir factura
          </Button>
          <LinkButton to={`/facturas/${invoice.id}/editar`} variant="outline">
            Editar
          </LinkButton>
          {step === 'confirm-delete' ? (
            <span className="flex items-center gap-4 text-small">
              <button type="button" className="font-medium underline underline-offset-4" onClick={() => remove.mutate()}>
                {remove.isPending ? 'Eliminando…' : 'Sí, eliminar borrador'}
              </button>
              <button type="button" className={linkClass} onClick={() => setStep('idle')}>
                Cancelar
              </button>
            </span>
          ) : (
            <button type="button" className={linkClass} onClick={() => setStep('confirm-delete')}>
              Eliminar borrador
            </button>
          )}
        </div>
      )}

      {problems.length > 0 && (
        <Notice>
          <span className="flex flex-col gap-2">
            <span>Todavía no se puede emitir:</span>
            <ul className="flex flex-col gap-1 font-normal">
              {problems.map((p) => (
                <li key={p.message}>— {p.message}</li>
              ))}
            </ul>
            <span className="flex gap-6 font-normal">
              <Link to="/ajustes/empresa" className="underline underline-offset-4">
                Datos de la empresa
              </Link>
              <Link to={`/clientes/${invoice.clientId}/editar`} className="underline underline-offset-4">
                Ficha del cliente
              </Link>
            </span>
          </span>
        </Notice>
      )}
      {issue.error && problems.length === 0 && <Notice>{errorMessage(issue.error)}</Notice>}
      {remove.error && <Notice>{errorMessage(remove.error)}</Notice>}
    </section>
  )
}

// ─── Emitida: cobro y rectificativa ─────────────────────────────────────────

function IssuedActions({ invoice }: { invoice: Invoice }) {
  const navigate = useNavigate()
  const onUpdated = useInvoiceUpdated()
  const queryClient = useQueryClient()
  const [paidOn, setPaidOn] = useState(todayInSpain())
  const [rectifying, setRectifying] = useState(false)
  const [reason, setReason] = useState('')

  const payment = useMutation({
    mutationFn: (date: string | null) => invoicesApi.setPayment(invoice.id, date),
    onSuccess: onUpdated,
  })
  const rectify = useMutation({
    mutationFn: () => invoicesApi.rectify(invoice.id, reason),
    onSuccess: (draft) => {
      void queryClient.invalidateQueries({ queryKey: invoiceKeys.all })
      navigate(`/facturas/${draft.id}/editar`)
    },
  })
  const paymentError = payment.error instanceof ApiError ? payment.error : null

  return (
    <section className="flex flex-col gap-8">
      {invoice.paidOn ? (
        <div className="flex flex-wrap items-baseline gap-6">
          <p>
            <b className="font-medium">Cobrada</b> el {formatShortDate(invoice.paidOn)}.
          </p>
          <button type="button" className={linkClass} onClick={() => payment.mutate(null)}>
            {payment.isPending ? 'Deshaciendo…' : 'Deshacer cobro'}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-6">
          <div className="sm:w-56">
            <TextField
              label="Fecha de cobro"
              type="date"
              value={paidOn}
              error={paymentError?.fieldErrors.paidOn}
              onChange={(e) => setPaidOn(e.target.value)}
            />
          </div>
          <Button variant="primary" loading={payment.isPending} loadingLabel="Guardando…" onClick={() => payment.mutate(paidOn)}>
            Registrar cobro
          </Button>
        </div>
      )}
      {paymentError && !paymentError.fieldErrors.paidOn && <Notice>{paymentError.message}</Notice>}

      <div className="flex flex-col gap-4 border-t border-hodex-line pt-6">
        {rectifying ? (
          <div className="flex max-w-[640px] flex-col gap-5">
            <p className="text-hodex-gray">
              Se creará un borrador de rectificativa con los mismos conceptos en negativo (anulación total). Podrás
              ajustarlo antes de emitirlo.
            </p>
            <TextField
              label="Motivo de la rectificación"
              value={reason}
              error={rectify.error instanceof ApiError ? rectify.error.fieldErrors.reason : undefined}
              onChange={(e) => setReason(e.target.value)}
            />
            <div className="flex items-center gap-6">
              <Button variant="dark" loading={rectify.isPending} loadingLabel="Creando…" onClick={() => rectify.mutate()}>
                Crear rectificativa
              </Button>
              <button type="button" className={linkClass} onClick={() => setRectifying(false)}>
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className={`self-start ${linkClass}`} onClick={() => setRectifying(true)}>
            ¿Hay un error? Crear factura rectificativa
          </button>
        )}
      </div>
    </section>
  )
}
