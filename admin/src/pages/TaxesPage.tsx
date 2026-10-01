import { useState, type ReactNode } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { ApiError, saveBlob } from '../api/client'
import { taxesApi, taxKeys, type QuarterTaxes, type TaxPeriod } from '../api/taxes'
import { Eyebrow } from '../components/brand'
import { Button } from '../components/Button'
import { SelectField } from '../components/fields'
import { FilterTabs, QueryStatus } from '../components/lists'
import { PageHeader } from '../components/PageHeader'
import { ReauthPrompt } from '../components/ReauthPrompt'
import { Notice } from '../components/Notice'
import { formatCents } from '../lib/money'
import { formatShortDate, todayInSpain } from '../lib/periods'

const QUARTERS = [
  { value: '1', label: '1T' },
  { value: '2', label: '2T' },
  { value: '3', label: '3T' },
  { value: '4', label: '4T' },
]

/** Fila de casilla: número, concepto e importe. */
function BoxRow({ box, label, cents, strong = false }: { box: string | null; label: string; cents: number; strong?: boolean }) {
  return (
    <div className={`flex items-baseline gap-4 border-b border-hodex-line py-3 ${strong ? 'font-medium' : ''}`}>
      <span className="inline-flex h-7 w-11 shrink-0 items-center justify-center border border-hodex-line text-small text-hodex-gray tabular-nums">
        {box ?? '—'}
      </span>
      <span className="min-w-0 flex-1 text-small sm:text-base">{label}</span>
      <span className="tabular-nums">{formatCents(cents)}</span>
    </div>
  )
}

function ResultCard({ title, label, cents, note }: { title: string; label: string; cents: number; note: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 bg-hodex-white p-6 md:p-8">
      <span className="text-eyebrow uppercase tracking-eyebrow text-hodex-gray">{title}</span>
      <span className="font-display text-h1 leading-tight font-extralight tabular-nums">{formatCents(cents)}</span>
      <span className="font-medium">{label}</span>
      <span className="text-small text-hodex-gray">{note}</span>
    </div>
  )
}

function daysUntil(isoDate: string): number {
  return Math.round((Date.parse(`${isoDate}T00:00:00Z`) - Date.parse(`${todayInSpain()}T00:00:00Z`)) / 86_400_000)
}

export function TaxesPage() {
  // null = el trimestre que toca declarar (lo decide el servidor).
  const [period, setPeriod] = useState<TaxPeriod | null>(null)
  const query = useQuery({ queryKey: taxKeys.quarter(period), queryFn: () => taxesApi.get(period) })

  return (
    <div className="flex flex-col gap-14">
      <PageHeader
        eyebrow="Gestión"
        title="Impuestos"
        description="Modelos 303 (IVA) y 130 (IRPF) calculados con tus facturas emitidas y tus gastos. Es una ayuda: revísalo antes de presentarlo."
      />
      {query.isPending ? (
        <QueryStatus />
      ) : query.isError ? (
        <QueryStatus error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        <TaxesView data={query.data} onPeriod={setPeriod} />
      )}
    </div>
  )
}

function TaxesView({ data, onPeriod }: { data: QuarterTaxes; onPeriod: (p: TaxPeriod) => void }) {
  const { period, deadline, model303: m303, model130: m130 } = data
  const current: TaxPeriod = { year: period.year, quarter: period.quarter }
  const thisYear = Number(todayInSpain().slice(0, 4))
  const years = [thisYear, thisYear - 1, thisYear - 2].map((y) => ({ value: String(y), label: String(y) }))
  const left = daysUntil(deadline.to)
  const started = daysUntil(deadline.from) <= 0

  return (
    <>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <FilterTabs
          label="Trimestre"
          options={QUARTERS}
          value={String(period.quarter)}
          onChange={(q) => onPeriod({ year: period.year, quarter: Number(q) })}
        />
        <div className="w-40">
          <SelectField
            label="Año"
            options={years}
            value={String(period.year)}
            onChange={(e) => onPeriod({ year: Number(e.target.value), quarter: period.quarter })}
          />
        </div>
      </div>

      <p className="-mt-6 text-hodex-gray">
        Del {formatShortDate(period.from)} al {formatShortDate(period.to)} · {data.counts.invoices}{' '}
        {data.counts.invoices === 1 ? 'factura emitida' : 'facturas emitidas'} · {data.counts.expenses}{' '}
        {data.counts.expenses === 1 ? 'gasto' : 'gastos'}.{' '}
        <b className="font-semibold text-hodex-black">
          {left < 0
            ? `El plazo terminó el ${formatShortDate(deadline.to)}.`
            : started
              ? `Plazo hasta el ${formatShortDate(deadline.to)} (${left === 0 ? 'hoy' : left === 1 ? 'queda 1 día' : `quedan ${left} días`}).`
              : `Se presenta del ${formatShortDate(deadline.from)} al ${formatShortDate(deadline.to)}.`}
        </b>
      </p>

      <div className="grid gap-px border border-hodex-line bg-hodex-line md:grid-cols-2">
        <ResultCard
          title="Modelo 303 · IVA"
          cents={Math.abs(m303.resultCents)}
          label={m303.resultCents > 0 ? 'A ingresar' : m303.resultCents < 0 ? 'A compensar' : 'Sin actividad'}
          note={
            m303.resultCents < 0
              ? period.quarter === 4
                ? 'En el 4T puedes pedir la devolución o compensarlo el año que viene.'
                : 'Se arrastra a los siguientes trimestres (casilla 78).'
              : 'IVA cobrado en tus facturas menos el IVA deducible de tus gastos.'
          }
        />
        <ResultCard
          title="Modelo 130 · IRPF"
          cents={m130.toPayCents}
          label={m130.toPayCents > 0 ? 'A ingresar' : 'Sin ingreso'}
          note="20 % de lo que llevas ganado en el año, menos retenciones y pagos anteriores."
        />
      </div>

      {data.warnings.length > 0 && (
        <section className="flex flex-col gap-4">
          <Eyebrow>Revisa antes de presentar</Eyebrow>
          <ul className="flex flex-col gap-2 border-l border-hodex-black pl-4">
            {data.warnings.map((w) => (
              <li key={w.code}>
                <b className="font-semibold tabular-nums">{w.count}</b> {w.message}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-14 lg:grid-cols-2 lg:gap-10">
        <section className="flex flex-col gap-6">
          <Eyebrow>Modelo 303</Eyebrow>
          <div className="border-t border-hodex-line">
            {m303.accrued.length === 0 && <BoxRow box={null} label="Sin IVA repercutido en el trimestre" cents={0} />}
            {m303.accrued.flatMap((r) => [
              <BoxRow key={`b${r.rateBp}`} box={r.baseBox} label={`Base imponible al ${r.rateBp / 100} %`} cents={r.baseCents} />,
              <BoxRow key={`c${r.rateBp}`} box={r.vatBox} label={`Cuota al ${r.rateBp / 100} %`} cents={r.vatCents} />,
            ])}
            <BoxRow box="27" label="Total cuota devengada" cents={m303.totalAccruedVatCents} strong />
            {m303.deductible.map((b) => (
              <BoxRow key={b.box} {...b} />
            ))}
            <BoxRow box="45" label="Total a deducir" cents={m303.totalDeductibleCents} strong />
            <BoxRow box="46" label="Resultado" cents={m303.resultCents} strong />
          </div>
          {m303.informative.length > 0 && (
            <div className="flex flex-col gap-3">
              <p className="text-small text-hodex-gray">Informativas (sin IVA español):</p>
              <div className="border-t border-hodex-line">
                {m303.informative.map((b) => (
                  <BoxRow key={b.box + b.label} {...b} />
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="flex flex-col gap-6">
          <Eyebrow>Modelo 130</Eyebrow>
          <div className="border-t border-hodex-line">
            <BoxRow box="01" label="Ingresos del año" cents={m130.incomeCents} />
            <BoxRow box="02" label="Gastos deducibles del año" cents={m130.expensesCents} />
            <BoxRow box="03" label="Rendimiento neto" cents={m130.netCents} strong />
            <BoxRow box="04" label="20 % del rendimiento" cents={m130.twentyPercentCents} />
            <BoxRow box="05" label="Pagado en trimestres anteriores" cents={m130.previousPaymentsCents} />
            <BoxRow box="06" label="Retenciones de tus clientes" cents={m130.withholdingsCents} />
            <BoxRow box="07" label="Resultado" cents={m130.resultCents} strong />
          </div>
          <p className="text-small text-hodex-gray">
            No incluye la deducción por rendimientos bajos del año anterior (casilla 13) ni la cuota de autónomos si no la
            registras como gasto: apúntala cada mes en Gastos, categoría «Tasas y tributos».
          </p>
        </section>
      </div>

      <ExportSection period={current} />
    </>
  )
}

function ExportSection({ period }: { period: TaxPeriod }) {
  const [retry, setRetry] = useState<null | (() => void)>(null)

  const download = useMutation({
    mutationFn: (kind: 'package' | 'ingresos' | 'gastos') =>
      kind === 'package' ? taxesApi.package(period) : taxesApi.book(period, kind),
    onSuccess: ({ blob, filename }) => saveBlob(blob, filename),
    onError: (error, kind) => {
      if (error instanceof ApiError && error.code === 'ReauthRequired') setRetry(() => () => download.mutate(kind))
    },
  })
  const error = download.error instanceof ApiError && download.error.code === 'ReauthRequired' ? null : download.error
  const busy = (kind: string) => download.isPending && download.variables === kind

  return (
    <section className="flex flex-col gap-6 border-t border-hodex-line pt-14">
      <Eyebrow>Para la gestoría</Eyebrow>
      <p className="max-w-[640px] text-hodex-gray">
        Un ZIP con el resumen de impuestos, los libros de ingresos y gastos (Excel) y los PDF de todas las facturas y
        justificantes del trimestre. Te pediremos tu código de verificación.
      </p>
      <div className="flex flex-wrap items-center gap-4">
        <Button variant="primary" loading={busy('package')} loadingLabel="Preparando…" onClick={() => download.mutate('package')}>
          Descargar paquete del trimestre
        </Button>
        <Button variant="outline" loading={busy('ingresos')} loadingLabel="Descargando…" onClick={() => download.mutate('ingresos')}>
          Libro de ingresos
        </Button>
        <Button variant="outline" loading={busy('gastos')} loadingLabel="Descargando…" onClick={() => download.mutate('gastos')}>
          Libro de gastos
        </Button>
      </div>
      {retry && (
        <ReauthPrompt
          onConfirmed={() => {
            setRetry(null)
            retry()
          }}
          onCancel={() => setRetry(null)}
        />
      )}
      {error && <Notice>{error instanceof ApiError ? error.message : 'No se pudo descargar.'}</Notice>}
    </section>
  )
}
