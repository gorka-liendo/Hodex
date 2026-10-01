import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { contactKeys, contactRoleLabel, contactsApi, type ContactFilters } from '../../api/contacts'
import { LinkButton } from '../../components/Button'
import { TextField } from '../../components/fields'
import { EmptyState, FilterTabs, Pagination, QueryStatus } from '../../components/lists'
import { PageHeader } from '../../components/PageHeader'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'

const PAGE_SIZE = 25

type RoleFilter = NonNullable<ContactFilters['role']>
type StatusFilter = NonNullable<ContactFilters['status']>

const ROLE_OPTIONS: Array<{ value: RoleFilter; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'client', label: 'Clientes' },
  { value: 'supplier', label: 'Proveedores' },
]

const COLUMNS = 'md:grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,1fr)]'

export function ContactsPage() {
  // Filtros en la URL: se conservan al volver atrás y se pueden guardar como enlace.
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const role = (params.get('role') as RoleFilter | null) ?? 'all'
  const status = (params.get('status') as StatusFilter | null) ?? 'active'
  const page = Number(params.get('page') ?? 1) || 1

  function setFilter(key: string, value: string, defaultValue: string) {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value === defaultValue) next.delete(key)
        else next.set(key, value)
        if (key !== 'page') next.delete('page') // Cambiar un filtro vuelve a la página 1.
        return next
      },
      { replace: true },
    )
  }

  const filters: ContactFilters = {
    q: useDebouncedValue(q.trim()),
    role,
    status,
    page,
    pageSize: PAGE_SIZE,
  }
  const query = useQuery({
    queryKey: contactKeys.list(filters),
    queryFn: () => contactsApi.list(filters),
    placeholderData: keepPreviousData,
  })

  const isFiltering = Boolean(filters.q) || role !== 'all'

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        eyebrow="Gestión"
        title="Clientes y proveedores"
        description="Las fichas con las que facturas y registras gastos."
        actions={
          <LinkButton to="/clientes/nuevo" variant="primary">
            Nuevo contacto
          </LinkButton>
        }
      />

      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="w-full md:max-w-[360px]">
          <TextField
            label="Buscar"
            type="search"
            placeholder="Nombre, NIF, email o ciudad"
            value={q}
            onChange={(e) => setFilter('q', e.target.value, '')}
          />
        </div>
        <div className="flex flex-col gap-2 md:items-end">
          <FilterTabs
            label="Tipo de contacto"
            options={ROLE_OPTIONS}
            value={role}
            onChange={(value) => setFilter('role', value, 'all')}
          />
          <button
            type="button"
            onClick={() => setFilter('status', status === 'active' ? 'archived' : 'active', 'active')}
            className="text-small text-hodex-gray underline-offset-4 transition-colors hover:text-hodex-black hover:underline"
          >
            {status === 'active' ? 'Ver archivados' : '← Volver a los activos'}
          </button>
        </div>
      </div>

      {query.isPending ? (
        <QueryStatus />
      ) : query.isError ? (
        <QueryStatus error={query.error} onRetry={() => void query.refetch()} />
      ) : query.data.total === 0 ? (
        isFiltering || status === 'archived' ? (
          <EmptyState title="Sin resultados">
            {status === 'archived'
              ? 'No hay contactos archivados con estos filtros.'
              : 'Ningún contacto coincide con la búsqueda.'}
          </EmptyState>
        ) : (
          <EmptyState
            title="Aún no tienes contactos"
            action={
              <LinkButton to="/clientes/nuevo" variant="dark">
                Crear el primero
              </LinkButton>
            }
          >
            Da de alta a tus clientes y proveedores con su NIF para poder facturarles y asociarles
            gastos.
          </EmptyState>
        )
      ) : (
        <section aria-label="Listado de contactos" className={query.isPlaceholderData ? 'opacity-60' : ''}>
          <div
            className={`hidden gap-6 border-b border-hodex-line pb-3 text-eyebrow uppercase tracking-eyebrow text-hodex-gray md:grid ${COLUMNS}`}
          >
            <span>Nombre</span>
            <span>NIF / CIF</span>
            <span>Tipo</span>
            <span>Ciudad</span>
          </div>
          <ul>
            {query.data.items.map((contact) => (
              <li key={contact.id} className="border-b border-hodex-line">
                <Link
                  to={`/clientes/${contact.id}`}
                  className={`grid gap-1 px-2 py-5 transition-colors duration-300 hover:bg-hodex-white md:-mx-2 md:items-baseline md:gap-6 ${COLUMNS}`}
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-medium text-hodex-black">{contact.legalName}</span>
                    {contact.tradeName && (
                      <span className="truncate text-small text-hodex-gray">{contact.tradeName}</span>
                    )}
                  </span>
                  <span className="text-small text-hodex-black tabular-nums">
                    {contact.taxId ?? <span className="text-hodex-gray-light">—</span>}
                  </span>
                  <span className="text-small text-hodex-gray">{contactRoleLabel(contact)}</span>
                  <span className="truncate text-small text-hodex-gray">{contact.city ?? '—'}</span>
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
