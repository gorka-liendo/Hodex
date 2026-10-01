import { useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { auditApi, auditKeys, type AuditFilters, type AuditGroup } from '../api/audit'
import { Eyebrow } from '../components/brand'
import { FilterTabs, Pagination, QueryStatus } from '../components/lists'
import { PageHeader } from '../components/PageHeader'
import { describeDevice, describeEntry } from '../lib/activity'
import { formatShortDateTime } from '../lib/format'

const GROUPS: Array<{ value: AuditGroup; label: string }> = [
  { value: 'all', label: 'Todo' },
  { value: 'access', label: 'Accesos' },
  { value: 'invoices', label: 'Facturas' },
  { value: 'expenses', label: 'Gastos' },
  { value: 'ai', label: 'IA' },
  { value: 'contacts', label: 'Contactos' },
  { value: 'settings', label: 'Ajustes' },
]

const OUTCOMES: Array<{ value: AuditFilters['outcome']; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'failure', label: 'Solo fallos' },
]

/** Precio orientativo de Claude Haiku 4.5 (USD por millón de tokens). */
const HAIKU_USD_PER_MTOK = { input: 1, output: 5 }

export function ActivityPage() {
  const [filters, setFilters] = useState<AuditFilters>({ group: 'all', outcome: 'all', page: 1 })
  const query = useQuery({
    queryKey: auditKeys.list(filters),
    queryFn: () => auditApi.list(filters),
    placeholderData: keepPreviousData,
  })
  const data = query.data
  const aiCostUsd = data
    ? (data.aiUsage.inputTokens * HAIKU_USD_PER_MTOK.input + data.aiUsage.outputTokens * HAIKU_USD_PER_MTOK.output) / 1_000_000
    : 0

  return (
    <div className="flex flex-col gap-14">
      <PageHeader
        eyebrow="Cuenta"
        title="Actividad"
        description="Todo lo que pasa en el panel queda registrado y no se puede modificar ni borrar, ni siquiera desde aquí."
      />

      {data && (
        <dl className="grid gap-px border border-hodex-line bg-hodex-line sm:grid-cols-3">
          {[
            ['Accesos fallidos · 24 h', String(data.failedLogins24h)],
            ['Lecturas con IA · este mes', String(data.aiUsage.readings)],
            ['Coste aprox. de la IA · este mes', `${aiCostUsd.toFixed(2).replace('.', ',')} $`],
          ].map(([label, value]) => (
            <div key={label} className="flex flex-col gap-2 bg-hodex-white p-6">
              <dt className="text-eyebrow uppercase tracking-eyebrow text-hodex-gray">{label}</dt>
              <dd className="font-display text-h3 leading-tight font-extralight tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      )}

      <section className="flex flex-col gap-6">
        <Eyebrow>Registro</Eyebrow>
        <div className="flex flex-col justify-between gap-4 md:flex-row">
          <FilterTabs
            label="Tipo de actividad"
            options={GROUPS}
            value={filters.group}
            onChange={(group) => setFilters({ ...filters, group, page: 1 })}
          />
          <FilterTabs
            label="Resultado"
            options={OUTCOMES}
            value={filters.outcome}
            onChange={(outcome) => setFilters({ ...filters, outcome, page: 1 })}
          />
        </div>

        {!data ? (
          <QueryStatus error={query.error} onRetry={() => void query.refetch()} />
        ) : data.items.length === 0 ? (
          <p className="border-t border-hodex-line py-8 text-hodex-gray">No hay actividad con estos filtros.</p>
        ) : (
          <>
            <ol className={`border-t border-hodex-line transition-opacity ${query.isFetching ? 'opacity-60' : ''}`}>
              {data.items.map((entry) => {
                const device = describeDevice(entry.userAgent)
                return (
                  <li
                    key={entry.id}
                    className="grid gap-1 border-b border-hodex-line py-4 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-6"
                  >
                    <span className="text-small text-hodex-gray tabular-nums">{formatShortDateTime(entry.occurredAt)}</span>
                    <span className="flex flex-col gap-1">
                      <span className={entry.outcome === 'failure' ? 'font-semibold text-hodex-black' : ''}>
                        {entry.outcome === 'failure' && (
                          <span className="mr-2 text-eyebrow uppercase tracking-eyebrow">Fallo ·</span>
                        )}
                        {describeEntry(entry)}
                      </span>
                      {(entry.ipAddress || device) && (
                        <span className="text-small text-hodex-gray-light">
                          {[entry.ipAddress, device].filter(Boolean).join(' · ')}
                        </span>
                      )}
                    </span>
                  </li>
                )
              })}
            </ol>
            <Pagination
              page={data.page}
              pageSize={data.pageSize}
              total={data.total}
              onChange={(page) => setFilters({ ...filters, page })}
            />
          </>
        )}
      </section>
    </div>
  )
}
