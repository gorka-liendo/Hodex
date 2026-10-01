import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { invoiceKeys, invoicesApi, invoiceState, type InvoiceFilters } from '../../api/invoices'
import { LinkButton } from '../../components/Button'
import { TextField } from '../../components/fields'
import { EmptyState, FilterTabs, Pagination, QueryStatus } from '../../components/lists'
import { PageHeader } from '../../components/PageHeader'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { formatCents } from '../../lib/money'
import { formatShortDate, PERIOD_OPTIONS, periodRange, todayInSpain, type PeriodKey } from '../../lib/periods'

const PAGE_SIZE = 25

type StateFilter = 'all' | 'draft' | 'unpaid' | 'overdue' | 'paid'

const STATE_OPTIONS: Array<{ value: StateFilter; label: string }> = [
  { value: 'all', label: 'Todas' },
  { value: 'draft', label: 'Borradores' },
  { value: 'unpaid', label: 'Pendientes' },
  { value: 'overdue', label: 'Vencidas' },
  { value: 'paid', label: 'Cobradas' },
]

/** Traduce el filtro de la pantalla a los parámetros de la API. */
function stateToFilters(state: StateFilter): Pick<InvoiceFilters, 'status' | 'payment'> {
  switch (state) {
    case 'draft':
      return { status: 'draft' }
    case 'unpaid':
    case 'overdue':
    case 'paid':
      return { payment: state }
    default:
      return {}
  }
}

const COLUMNS = 'md:grid-cols-[8.5rem_minmax(0,2.2fr)_7rem_7rem_minmax(0,1fr)_6.5rem]'

export function InvoicesPage() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const period = (params.get('period') as PeriodKey | null) ?? 'year'
  const state = (params.get('state') as StateFilter | null) ?? 'all'
  const page = Number(params.get('page') ?? 1) || 1
  const today = todayInSpain()

  function setFilter(key: string, value: string, defaultValue: string) {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value === defaultValue) next.delete(key)
        else next.set(key, value)
        if (key !== 'page') next.delete('page')
        return next
      },
      { replace: true },
    )
  }

  const filters: InvoiceFilters = {
    q: useDebouncedValue(q.trim()),
    ...periodRange(period),
    ...stateToFilters(state),
    page,
    pageSize: PAGE_SIZE,
  }
  const query = useQuery({
    queryKey: invoiceKeys.list(filters),
    queryFn: () => invoicesApi.list(filters),
    placeholderData: keepPreviousData,
  })

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        eyebrow="Gestión"
        title="Facturas"
        description="Emisión con numeración correlativa. Una factura emitida no se modifica: se corrige con una rectificativa."
        actions={
          <LinkButton to="/facturas/nueva" variant="primary">
            Nueva factura
          </LinkButton>
        }
      />

      <div className="flex flex-col gap-6">
        <FilterTabs label="Periodo" options={PERIOD_OPTIONS} value={period} onChange={(v) => setFilter('period', v, 'year')} />
        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <TextField
            label="Buscar"
            type="search"
            placeholder="Número, cliente o nota"
            value={q}
            onChange={(e) => setFilter('q', e.target.value, '')}
          />
          <FilterTabs label="Estado" options={STATE_OPTIONS} value={state} onChange={(v) => setFilter('state', v, 'all')} />
        </div>
      </div>

      {query.data && query.data.sums.totalCents !== 0 && (
        <dl className="grid gap-px border border-hodex-line bg-hodex-line sm:grid-cols-3">
          {[
            ['Facturado (base)', query.data.sums.baseCents],
            ['IVA repercutido', query.data.sums.vatCents],
            ['Pendiente de cobro', query.data.sums.outstandingCents],
          ].map(([label, cents]) => (
            <div key={label} className="flex flex-col gap-3 bg-hodex-white p-6">
              <dt className="text-eyebrow uppercase tracking-eyebrow text-hodex-gray">{label}</dt>
              <dd className="font-display text-h3 leading-tight font-extralight tabular-nums">{formatCents(cents as number)}</dd>
            </div>
          ))}
        </dl>
      )}

      {query.isPending ? (
        <QueryStatus />
      ) : query.isError ? (
        <QueryStatus error={query.error} onRetry={() => void query.refetch()} />
      ) : query.data.total === 0 ? (
        <EmptyState
          title={period === 'all' ? 'No hay facturas con estos filtros' : 'No hay facturas con fecha en este periodo'}
          action={
            period === 'all' ? (
              <LinkButton to="/facturas/nueva" variant="dark">
                Crear una factura
              </LinkButton>
            ) : (
              <button
                type="button"
                onClick={() => setFilter('period', 'all', 'year')}
                className="self-start text-small text-hodex-black underline underline-offset-4"
              >
                Ver todas las facturas
              </button>
            )
          }
        >
          {period === 'all'
            ? 'Crea un borrador, revísalo y emítelo cuando esté listo: al emitirlo recibe su número definitivo.'
            : 'Las facturas se agrupan por su fecha de emisión.'}
        </EmptyState>
      ) : (
        <section aria-label="Listado de facturas" className={query.isPlaceholderData ? 'opacity-60' : ''}>
          <div
            className={`hidden gap-6 border-b border-hodex-line pb-3 text-eyebrow uppercase tracking-eyebrow text-hodex-gray md:grid ${COLUMNS}`}
          >
            <span>Número</span>
            <span>Cliente</span>
            <span>Fecha</span>
            <span>Vence</span>
            <span className="text-right">Total</span>
            <span className="text-right">Estado</span>
          </div>
          <ul>
            {query.data.items.map((invoice) => {
              const label = invoiceState(invoice, today)
              return (
                <li key={invoice.id} className="border-b border-hodex-line">
                  <Link
                    to={`/facturas/${invoice.id}`}
                    className={`grid grid-cols-[1fr_auto] gap-x-6 gap-y-1 px-2 py-5 transition-colors duration-300 hover:bg-hodex-white md:-mx-2 md:items-baseline ${COLUMNS}`}
                  >
                    <span className={`tabular-nums ${invoice.fullNumber ? 'font-medium' : 'text-hodex-gray'}`}>
                      {invoice.fullNumber ?? 'Borrador'}
                    </span>
                    <span className="col-start-1 truncate md:col-start-auto">{invoice.clientName}</span>
                    <span className="hidden text-small text-hodex-gray tabular-nums md:block">{formatShortDate(invoice.issueDate)}</span>
                    <span className="hidden text-small text-hodex-gray tabular-nums md:block">
                      {invoice.dueDate ? formatShortDate(invoice.dueDate) : '—'}
                    </span>
                    <span className="row-start-1 text-right font-medium tabular-nums md:row-start-auto">
                      {formatCents(invoice.totalCents)}
                    </span>
                    <span
                      className={`text-right text-eyebrow uppercase tracking-eyebrow ${
                        label === 'Vencida'
                          ? 'font-semibold text-hodex-black'
                          : label === 'Pendiente'
                            ? 'text-hodex-black'
                            : 'text-hodex-gray-light'
                      }`}
                    >
                      {label}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
          <Pagination
            page={query.data.page}
            pageSize={query.data.pageSize}
            total={query.data.total}
            onChange={(next) => setFilter('page', String(next), '1')}
          />
        </section>
      )}
    </div>
  )
}
