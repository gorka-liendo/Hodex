import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { attachmentsApi, formatFileSize } from '../../api/attachments'
import { ApiError } from '../../api/client'
import { EXPENSE_CATEGORIES } from '../../api/expenses'
import { inboxApi, inboxKeys, type Inbox, type InboxItem } from '../../api/inbox'
import { Eyebrow } from '../../components/brand'
import { LinkButton } from '../../components/Button'
import { EmptyState, QueryStatus } from '../../components/lists'
import { Notice } from '../../components/Notice'
import { PageHeader } from '../../components/PageHeader'
import { formatShortDateTime } from '../../lib/format'
import { formatCents } from '../../lib/money'
import { formatShortDate } from '../../lib/periods'

const linkClass = 'text-small text-hodex-gray underline-offset-4 hover:text-hodex-black hover:underline'

/** Facturas recibidas por email: revisarlas y guardarlas como gasto, o descartarlas. */
export function InboxPage() {
  const query = useQuery({
    queryKey: inboxKeys.list,
    queryFn: inboxApi.list,
    // Mientras haya correos procesándose, se refresca solo.
    refetchInterval: (q) => (q.state.data?.items.some((i) => i.status === 'received') ? 3000 : false),
  })

  return (
    <div className="flex flex-col gap-12">
      <PageHeader
        eyebrow="Gastos"
        title="Recibidas por email"
        description="Las facturas que reenvías a tu dirección de facturas llegan aquí, leídas por la IA. Nada cuenta como gasto hasta que lo revisas y lo guardas."
      />
      {query.isPending ? (
        <QueryStatus />
      ) : query.isError ? (
        <QueryStatus error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        <InboxView inbox={query.data} />
      )}
    </div>
  )
}

function AddressBox({ inbox }: { inbox: Inbox }) {
  const [copied, setCopied] = useState(false)
  if (!inbox.enabled) {
    return (
      <Notice tone="info">
        La recepción por email aún no está activada. Falta configurar el webhook de Resend en el servidor
        (RESEND_WEBHOOK_SECRET).
      </Notice>
    )
  }
  return (
    <div className="flex flex-col gap-3 border border-hodex-line bg-hodex-white p-6">
      <span className="text-eyebrow uppercase tracking-eyebrow text-hodex-gray">Tu dirección de facturas</span>
      {inbox.address ? (
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
          <span className="font-display text-h3 leading-tight font-light break-all">{inbox.address}</span>
          <button
            type="button"
            className={linkClass}
            onClick={() => void navigator.clipboard.writeText(inbox.address!).then(() => setCopied(true))}
          >
            {copied ? 'Copiada' : 'Copiar'}
          </button>
        </div>
      ) : (
        <span className="text-hodex-gray">Configura INBOUND_ADDRESS en el servidor para verla aquí.</span>
      )}
      <p className="max-w-[640px] text-small text-hodex-gray">
        Reenvía aquí las facturas desde team@hodex.es, o dásela a tus proveedores como email de facturación. Solo se
        procesan los correos de tu cuenta y de los proveedores dados de alta con su email; los demás esperan a que los
        aceptes.
      </p>
    </div>
  )
}

function InboxView({ inbox }: { inbox: Inbox }) {
  const review = inbox.items.filter((i) => i.status !== 'blocked')
  const blocked = inbox.items.filter((i) => i.status === 'blocked')

  return (
    <>
      <AddressBox inbox={inbox} />

      <section className="flex flex-col gap-6">
        <Eyebrow>Por revisar</Eyebrow>
        {review.length === 0 ? (
          <EmptyState title="No hay nada por revisar.">
            Cuando reenvíes una factura, aparecerá aquí en unos segundos con sus datos ya leídos.
          </EmptyState>
        ) : (
          <ul className="border-t border-hodex-line">
            {review.map((item) => (
              <InboxRow key={item.id} item={item} />
            ))}
          </ul>
        )}
      </section>

      {blocked.length > 0 && (
        <section className="flex flex-col gap-6">
          <Eyebrow>De remitentes no autorizados</Eyebrow>
          <p className="max-w-[640px] text-hodex-gray">
            No se ha descargado nada de estos correos. Acéptalos solo si los reconoces; para que los próximos entren solos,
            da de alta al proveedor con ese email.
          </p>
          <ul className="border-t border-hodex-line">
            {blocked.map((item) => (
              <InboxRow key={item.id} item={item} />
            ))}
          </ul>
        </section>
      )}
    </>
  )
}

function InboxRow({ item }: { item: InboxItem }) {
  const queryClient = useQueryClient()
  const refresh = () => void queryClient.invalidateQueries({ queryKey: inboxKeys.all })
  const accept = useMutation({ mutationFn: () => inboxApi.accept(item.id), onSuccess: refresh })
  const dismiss = useMutation({ mutationFn: () => inboxApi.dismiss(item.id), onSuccess: refresh })
  const error = accept.error ?? dismiss.error

  return (
    <li className="flex flex-col gap-4 border-b border-hodex-line py-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <span className="min-w-0">
          <span className="font-medium">{item.subject || '(sin asunto)'}</span>
          <span className="text-hodex-gray"> · {item.from}</span>
        </span>
        <span className="text-small text-hodex-gray tabular-nums">{formatShortDateTime(item.receivedAt)}</span>
      </div>

      {item.status === 'received' && (
        <p className="text-small text-hodex-gray" aria-live="polite">
          Descargando y leyendo los adjuntos…
        </p>
      )}
      {item.note && item.status !== 'blocked' && (
        <p className={`text-small ${item.status === 'failed' ? 'font-semibold text-hodex-black' : 'text-hodex-gray'}`}>
          {item.note}
        </p>
      )}

      {item.pending.map((file) => {
        const s = file.suggestion
        return (
          <div key={file.id} className="flex flex-col gap-3 border border-hodex-line bg-hodex-white p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-col gap-1">
              {s && s.totalCents !== null ? (
                <span className="flex flex-wrap items-baseline gap-x-3">
                  <span className="font-display text-h3 leading-tight font-light tabular-nums">{formatCents(s.totalCents)}</span>
                  <span>{s.supplier?.name ?? s.description ?? file.filename}</span>
                </span>
              ) : (
                <span>{file.filename}</span>
              )}
              <span className="text-small text-hodex-gray">
                {[
                  s?.issueDate && formatShortDate(s.issueDate),
                  s?.category && EXPENSE_CATEGORIES[s.category],
                  s?.invoiceNumber && `Nº ${s.invoiceNumber}`,
                  s?.totalCents != null ? `${file.filename} · ${formatFileSize(file.sizeBytes)}` : formatFileSize(file.sizeBytes),
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
              {s && s.warnings.length > 0 && <span className="text-small text-hodex-black">{s.warnings[0]}</span>}
            </div>
            <div className="flex shrink-0 items-center gap-6">
              <a href={attachmentsApi.fileUrl(file.id)} target="_blank" rel="noopener" className={linkClass}>
                Ver
              </a>
              <LinkButton to={`/gastos/nuevo?adjunto=${file.id}`} variant="dark">
                Revisar y guardar
              </LinkButton>
            </div>
          </div>
        )
      })}

      <div className="flex flex-wrap items-center gap-6">
        {(item.status === 'blocked' || item.status === 'failed') && (
          <button type="button" className="text-small text-hodex-black underline underline-offset-4" onClick={() => accept.mutate()}>
            {accept.isPending ? 'Procesando…' : item.status === 'blocked' ? 'Aceptar y procesar' : 'Reintentar'}
          </button>
        )}
        <button type="button" className={linkClass} onClick={() => dismiss.mutate()}>
          {dismiss.isPending ? 'Descartando…' : 'Descartar'}
        </button>
      </div>
      {error && <Notice>{error instanceof ApiError ? error.message : 'No se pudo completar la acción.'}</Notice>}
    </li>
  )
}

/** Aviso para la lista de gastos: cuántos justificantes recibidos esperan revisión. */
export function InboxBanner() {
  const query = useQuery({ queryKey: inboxKeys.count, queryFn: inboxApi.count })
  const count = query.data?.pendingCount ?? 0
  if (count === 0) return null
  return (
    <Link
      to="/gastos/recibidas"
      className="flex items-center justify-between gap-4 border border-hodex-black bg-hodex-white px-6 py-4 transition-colors hover:bg-hodex-off-white"
    >
      <span>
        <b className="font-semibold tabular-nums">{count}</b>{' '}
        {count === 1 ? 'factura recibida por email espera' : 'facturas recibidas por email esperan'} a que la revises.
      </span>
      <span aria-hidden="true">→</span>
    </Link>
  )
}
