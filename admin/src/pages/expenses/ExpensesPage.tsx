import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import {
  EXPENSE_CATEGORIES,
  expenseKeys,
  expensesApi,
  type ExpenseCategory,
  type ExpenseFilters,
} from '../../api/expenses'
import { LinkButton } from '../../components/Button'
import { SelectField, TextField } from '../../components/fields'
import { EmptyState, FilterTabs, Pagination, QueryStatus } from '../../components/lists'
import { PageHeader } from '../../components/PageHeader'
import { InboxBanner } from './InboxPage'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { formatCents } from '../../lib/money'
import { formatShortDate, PERIOD_OPTIONS, periodRange, type PeriodKey } from '../../lib/periods'

const PAGE_SIZE = 25
type StatusFilter = NonNullable<ExpenseFilters['status']>

const STATUS_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'unpaid', label: 'Pendientes' },
  { value: 'paid', label: 'Pagados' },
]

const CATEGORY_OPTIONS = [
  { value: '', label: 'Todas las categorías' },
  ...Object.entries(EXPENSE_CATEGORIES).map(([value, label]) => ({ value, label })),
]

const COLUMNS =
  'md:grid-cols-[6.5rem_minmax(0,2.4fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_5.5rem]'

export function ExpensesPage() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const period = (params.get('period') as PeriodKey | null) ?? 'quarter'
  const status = (params.get('status') as StatusFilter | null) ?? 'all'
  const category = (params.get('category') as ExpenseCategory | null) ?? undefined
  const page = Number(params.get('page') ?? 1) || 1

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

  const filters: ExpenseFilters = {
    q: useDebouncedValue(q.trim()),
    ...periodRange(period),
    status,
    category,
    page,
    pageSize: PAGE_SIZE,
  }
  const query = useQuery({
    queryKey: expenseKeys.list(filters),
    queryFn: () => expensesApi.list(filters),
    placeholderData: keepPreviousData,
  })

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        eyebrow="Gestión"
        title="Gastos"
        description="Facturas recibidas y gastos de la empresa, con su IVA soportado."
        actions={
          <div className="flex flex-wrap gap-4">
            <LinkButton to="/gastos/recibidas" variant="outline">
              Recibidas por email
            </LinkButton>
            <LinkButton to="/gastos/nuevo" variant="primary">
              Nuevo gasto
            </LinkButton>
          </div>
        }
      />

      <InboxBanner />

      <div className="flex flex-col gap-6">
        <FilterTabs
          label="Periodo"
          options={PERIOD_OPTIONS}
          value={period}
          onChange={(value) => setFilter('period', value, 'quarter')}
        />
        <div className="grid gap-6 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto] md:items-end">
          <TextField
            label="Buscar"
            type="search"
            placeholder="Concepto, nº de factura o proveedor"
            value={q}
            onChange={(e) => setFilter('q', e.target.value, '')}
          />
          <SelectField
            label="Categoría"
            options={CATEGORY_OPTIONS}
            value={category ?? ''}
            onChange={(e) => setFilter('category', e.target.value, '')}
          />
          <FilterTabs
            label="Estado de pago"
            options={STATUS_OPTIONS}
            value={status}
            onChange={(value) => setFilter('status', value, 'all')}
          />
        </div>
      </div>

      {query.data && query.data.total > 0 && (
        <dl className="grid gap-px border border-hodex-line bg-hodex-line sm:grid-cols-3">
          {[
            ['Base imponible', query.data.sums.baseCents],
            ['IVA soportado deducible', query.data.sums.deductibleVatCents],
            ['Total', query.data.sums.totalCents],
          ].map(([label, cents]) => (
            <div key={label} className="flex flex-col gap-3 bg-hodex-white p-6">
              <dt className="text-eyebrow uppercase tracking-eyebrow text-hodex-gray">{label}</dt>
              <dd className="font-display text-h3 leading-tight font-extralight tabular-nums">
                {formatCents(cents as number)}
              </dd>
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
          title={period === 'all' ? 'No hay gastos con estos filtros' : 'No hay gastos con fecha en este periodo'}
          action={
            period === 'all' ? (
              <LinkButton to="/gastos/nuevo" variant="dark">
                Registrar un gasto
              </LinkButton>
            ) : (
              <button
                type="button"
                onClick={() => setFilter('period', 'all', 'quarter')}
                className="self-start text-small text-hodex-black underline underline-offset-4"
              >
                Ver todos los gastos
              </button>
            )
          }
        >
          {period === 'all'
            ? 'Cambia los filtros o registra un gasto nuevo.'
            : 'Los gastos se agrupan por la fecha del ticket o la factura, no por el día en que los registras (así cuadra el IVA de cada trimestre).'}
        </EmptyState>
      ) : (
        <section aria-label="Listado de gastos" className={query.isPlaceholderData ? 'opacity-60' : ''}>
          <div
            className={`hidden gap-6 border-b border-hodex-line pb-3 text-eyebrow uppercase tracking-eyebrow text-hodex-gray md:grid ${COLUMNS}`}
          >
            <span>Fecha</span>
            <span>Concepto</span>
            <span>Categoría</span>
            <span className="text-right">Base</span>
            <span className="text-right">Total</span>
            <span className="text-right">Estado</span>
          </div>
          <ul>
            {query.data.items.map((expense) => (
              <li key={expense.id} className="border-b border-hodex-line">
                <Link
                  to={`/gastos/${expense.id}`}
                  className={`grid grid-cols-[1fr_auto] gap-x-6 gap-y-1 px-2 py-5 transition-colors duration-300 hover:bg-hodex-white md:-mx-2 md:items-baseline ${COLUMNS}`}
                >
                  <span className="text-small text-hodex-gray tabular-nums">
                    {formatShortDate(expense.issueDate)}
                  </span>
                  <span className="col-start-1 flex min-w-0 flex-col md:col-start-auto">
                    <span className="truncate font-medium">{expense.description}</span>
                    <span className="truncate text-small text-hodex-gray">
                      {expense.supplier?.legalName ?? 'Sin proveedor'}
                      {expense.invoiceNumber && ` · ${expense.invoiceNumber}`}
                    </span>
                  </span>
                  <span className="hidden truncate text-small text-hodex-gray md:block">
                    {EXPENSE_CATEGORIES[expense.category]}
                  </span>
                  <span className="hidden text-right text-small tabular-nums md:block">
                    {formatCents(expense.baseCents)}
                  </span>
                  <span className="row-start-1 text-right font-medium tabular-nums md:row-start-auto">
                    {formatCents(expense.totalCents)}
                  </span>
                  <span
                    className={`text-right text-eyebrow uppercase tracking-eyebrow ${
                      expense.paidOn ? 'text-hodex-gray-light' : 'text-hodex-black'
                    }`}
                  >
                    {expense.paidOn ? 'Pagado' : 'Pendiente'}
                  </span>
                </Link>
              </li>
            ))}
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
