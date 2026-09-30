import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { dashboardApi, dashboardKeys } from '../api/dashboard'
import { Eyebrow, IndexBox } from '../components/brand'
import { QueryStatus } from '../components/lists'
import { PageHeader } from '../components/PageHeader'
import { currentHourInSpain, formatLongDate } from '../lib/format'
import { formatCents } from '../lib/money'

const ROADMAP = [
  { phase: '00', name: 'Base segura', detail: 'Acceso con 2FA, sesiones, auditoría', status: 'Lista' },
  { phase: '01', name: 'Gestión', detail: 'Clientes, gastos y resumen', status: 'En curso' },
  { phase: '02', name: 'Facturación', detail: 'Emisión, PDF, envío por email y WhatsApp', status: 'Siguiente' },
  { phase: '03', name: 'Entrada', detail: 'Recepción de facturas por email', status: 'Pendiente' },
  { phase: '04', name: 'IA', detail: 'Lectura de facturas con Claude', status: 'Pendiente' },
  { phase: '05', name: 'Verifactu', detail: 'Cumplimiento con la AEAT', status: 'Pendiente' },
] as const

/** Indicador: etiqueta, cifra y nota. Si lleva `to`, enlaza al listado filtrado. */
function Kpi({ label, value, note, to }: { label: string; value: ReactNode; note: ReactNode; to?: string }) {
  const content = (
    <>
      <dt className="text-eyebrow uppercase tracking-eyebrow text-hodex-gray">{label}</dt>
      <dd className="font-display text-h2 leading-tight font-extralight tabular-nums">{value}</dd>
      <dd className="text-small text-hodex-gray-light">{note}</dd>
    </>
  )
  const className = 'flex h-full flex-col gap-4 bg-hodex-white p-6'
  return to ? (
    <Link to={to} className={`${className} transition-colors duration-300 hover:bg-hodex-off-white`}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  )
}

/** "1 gasto" / "3 gastos". */
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

function greeting(): string {
  const hour = currentHourInSpain()
  if (hour < 6) return 'Buenas noches'
  if (hour < 14) return 'Buenos días'
  if (hour < 21) return 'Buenas tardes'
  return 'Buenas noches'
}

export function DashboardPage() {
  const today = formatLongDate(new Date())
  const dashboard = useQuery({ queryKey: dashboardKeys.all, queryFn: dashboardApi.get })
  const data = dashboard.data

  return (
    <div className="flex flex-col gap-16">
      <PageHeader
        eyebrow="Resumen"
        title={greeting()}
        description={<span className="first-letter:uppercase">{today}</span>}
      />

      <section aria-labelledby="kpis" className="flex flex-col gap-6">
        <h2 id="kpis" className="sr-only">
          Indicadores
        </h2>
        {dashboard.isError ? (
          <QueryStatus error={dashboard.error} onRetry={() => void dashboard.refetch()} />
        ) : (
          <dl className="grid gap-px border border-hodex-line bg-hodex-line sm:grid-cols-2 xl:grid-cols-4">
            <Kpi label="Facturado este mes" value="—" note="Llega con la facturación (fase 02)" />
            <Kpi
              label="Gastos este mes"
              value={data ? formatCents(data.month.expensesBaseCents) : '…'}
              note={data ? `Base imponible · ${plural(data.month.expensesCount, 'gasto', 'gastos')}` : 'Base imponible'}
              to="/gastos?period=month"
            />
            <Kpi
              label={data ? `IVA soportado ${data.quarter.quarter}T` : 'IVA soportado'}
              value={data ? formatCents(data.quarter.deductibleVatCents) : '…'}
              note="Deducible en el trimestre"
              to="/gastos"
            />
            <Kpi
              label="Pendiente de pago"
              value={data ? formatCents(data.unpaidExpenses.totalCents) : '…'}
              note={data ? `${plural(data.unpaidExpenses.count, 'gasto', 'gastos')} sin pagar` : 'Gastos sin pagar'}
              to="/gastos?period=all&status=unpaid"
            />
          </dl>
        )}
      </section>

      <section aria-labelledby="roadmap" className="flex flex-col gap-6">
        <Eyebrow>
          <span id="roadmap">Estado del panel</span>
        </Eyebrow>
        <ol className="border-t border-hodex-line">
          {ROADMAP.map((item) => (
            <li
              key={item.phase}
              className="flex flex-col gap-2 border-b border-hodex-line py-5 sm:flex-row sm:items-center sm:gap-6"
            >
              <IndexBox>{item.phase}/</IndexBox>
              <div className="flex flex-1 flex-col sm:flex-row sm:items-baseline sm:gap-4">
                <span className="font-display text-h3 leading-tight font-light">{item.name}</span>
                <span className="text-small text-hodex-gray">{item.detail}</span>
              </div>
              <span
                className={`text-eyebrow uppercase tracking-eyebrow ${
                  item.status === 'En curso' || item.status === 'Lista' ? 'text-hodex-black' : 'text-hodex-gray-light'
                }`}
              >
                {item.status}
              </span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
