import { Eyebrow, IndexBox } from '../components/brand'
import { PageHeader } from '../components/PageHeader'
import { currentHourInSpain, formatLongDate } from '../lib/format'

/** Indicadores previstos. Sin datos reales todavía: se muestra "—", nunca cifras inventadas. */
const KPIS = [
  { label: 'Facturado este mes', note: 'Con el módulo de facturas' },
  { label: 'Gastos este mes', note: 'Con el módulo de gastos' },
  { label: 'IVA del trimestre', note: 'Estimado: repercutido − soportado' },
  { label: 'Pendiente de cobro', note: 'Facturas emitidas sin cobrar' },
] as const

const ROADMAP = [
  { phase: '00', name: 'Base segura', detail: 'Acceso con 2FA, sesiones, auditoría', status: 'En curso' },
  { phase: '01', name: 'Gestión', detail: 'Clientes, gastos y resumen', status: 'Siguiente' },
  { phase: '02', name: 'Facturación', detail: 'Emisión, PDF, envío por email y WhatsApp', status: 'Pendiente' },
  { phase: '03', name: 'Entrada', detail: 'Recepción de facturas por email', status: 'Pendiente' },
  { phase: '04', name: 'IA', detail: 'Lectura de facturas con Claude', status: 'Pendiente' },
  { phase: '05', name: 'Verifactu', detail: 'Cumplimiento con la AEAT', status: 'Pendiente' },
] as const

function greeting(): string {
  const hour = currentHourInSpain()
  if (hour < 6) return 'Buenas noches'
  if (hour < 14) return 'Buenos días'
  if (hour < 21) return 'Buenas tardes'
  return 'Buenas noches'
}

export function DashboardPage() {
  const today = formatLongDate(new Date())

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
        <dl className="grid gap-px border border-hodex-line bg-hodex-line sm:grid-cols-2 xl:grid-cols-4">
          {KPIS.map((kpi) => (
            <div key={kpi.label} className="flex flex-col gap-4 bg-hodex-white p-6">
              <dt className="text-eyebrow uppercase tracking-eyebrow text-hodex-gray">{kpi.label}</dt>
              <dd className="font-display text-h2 leading-tight font-extralight tabular-nums">—</dd>
              <dd className="text-small text-hodex-gray-light">{kpi.note}</dd>
            </div>
          ))}
        </dl>
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
                  item.status === 'En curso' ? 'text-hodex-black' : 'text-hodex-gray-light'
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
