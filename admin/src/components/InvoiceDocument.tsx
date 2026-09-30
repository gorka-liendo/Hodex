import type { PartySnapshot } from '../api/invoices'
import { countryName } from '../lib/countries'
import { formatCents, formatRate, milliToInput } from '../lib/money'
import { formatShortDate } from '../lib/periods'
import { Isotype } from './brand'

type Party = Omit<PartySnapshot, 'iban'> | null

export interface InvoiceDocumentProps {
  /** Número de factura o null si es borrador. */
  fullNumber: string | null
  kind: 'standard' | 'rectifying'
  issueDate: string
  dueDate: string | null
  issuer: Party
  client: Party
  lines: Array<{ description: string; quantityMilli: number; unitPriceCents: number; vatRateBp: number; baseCents: number }>
  vatBreakdown: Array<{ rateBp: number; baseCents: number; vatCents: number }>
  baseCents: number
  irpfRateBp: number
  irpfCents: number
  totalCents: number
  notes: string | null
  iban: string | null
  footer: string | null
  rectifies?: { fullNumber: string | null; reason: string | null } | null
  hash?: string | null
}

function PartyBlock({ title, party }: { title: string; party: Party }) {
  return (
    <div className="flex flex-col gap-1 text-small">
      <span className="mb-2 text-eyebrow uppercase tracking-eyebrow text-hodex-gray">{title}</span>
      {party ? (
        <>
          <span className="font-medium text-hodex-black">{party.legalName}</span>
          {party.taxId && <span className="tabular-nums">NIF {party.taxId}</span>}
          {party.addressLine && <span>{party.addressLine}</span>}
          {(party.postalCode || party.city) && (
            <span>{[party.postalCode, party.city].filter(Boolean).join(' ')}</span>
          )}
          {(party.province || party.country !== 'ES') && (
            <span>{[party.province, party.country !== 'ES' && countryName(party.country)].filter(Boolean).join(', ')}</span>
          )}
          {party.email && <span className="text-hodex-gray">{party.email}</span>}
        </>
      ) : (
        <span className="text-hodex-gray">—</span>
      )}
    </div>
  )
}

/**
 * La factura tal y como se entrega: emisor, cliente, líneas, desglose de IVA
 * por tipo (obligatorio), retención y total. Blanco y negro, hairlines.
 */
export function InvoiceDocument(props: InvoiceDocumentProps) {
  const title = props.kind === 'rectifying' ? 'Factura rectificativa' : 'Factura'

  return (
    // Hoja A4 (210 × 297) con márgenes proporcionales a los del PDF (56 pt de
    // 595 = 9,4 % del ancho). Si el contenido no cabe, la hoja crece.
    <article className="mx-auto flex aspect-[210/297] w-full max-w-[794px] flex-col gap-10 border border-hodex-line bg-hodex-white p-[9.4%] text-hodex-black shadow-[0_8px_30px_rgba(17,16,16,0.06)]">
      <header className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
        <div className="flex items-center gap-3">
          <Isotype className="h-8 w-auto" />
          <span className="font-display text-2xl font-light tracking-headline">
            {props.issuer?.tradeName ?? 'HODEX'}
          </span>
        </div>
        <div className="flex flex-col gap-1 md:items-end">
          <span className="text-eyebrow uppercase tracking-eyebrow text-hodex-gray">{title}</span>
          <span className="font-display text-h3 leading-tight font-light tabular-nums">
            {props.fullNumber ?? 'Borrador'}
          </span>
          <span className="text-small text-hodex-gray">Fecha: {formatShortDate(props.issueDate)}</span>
          {props.dueDate && (
            <span className="text-small text-hodex-gray">Vencimiento: {formatShortDate(props.dueDate)}</span>
          )}
        </div>
      </header>

      {props.rectifies && (
        <p className="border-l border-hodex-black pl-4 text-small">
          Rectifica la factura <b className="font-medium">{props.rectifies.fullNumber}</b>
          {props.rectifies.reason && <> · Motivo: {props.rectifies.reason}</>}
        </p>
      )}

      <div className="grid gap-8 border-y border-hodex-line py-8 md:grid-cols-2">
        <PartyBlock title="Emisor" party={props.issuer} />
        <PartyBlock title="Cliente" party={props.client} />
      </div>

      <table className="w-full text-small">
        <thead>
          <tr className="border-b border-hodex-line text-left text-eyebrow uppercase tracking-eyebrow text-hodex-gray">
            <th className="pb-3 font-normal">Concepto</th>
            <th className="pb-3 text-right font-normal">Cant.</th>
            <th className="hidden pb-3 text-right font-normal sm:table-cell">Precio</th>
            <th className="hidden pb-3 text-right font-normal sm:table-cell">IVA</th>
            <th className="pb-3 text-right font-normal">Importe</th>
          </tr>
        </thead>
        <tbody>
          {props.lines.length === 0 && (
            <tr>
              <td colSpan={5} className="py-6 text-hodex-gray">Sin líneas todavía.</td>
            </tr>
          )}
          {props.lines.map((line, i) => (
            <tr key={i} className="border-b border-hodex-line align-baseline">
              <td className="py-4 pr-4">{line.description}</td>
              <td className="py-4 text-right tabular-nums">{milliToInput(line.quantityMilli)}</td>
              <td className="hidden py-4 text-right tabular-nums sm:table-cell">{formatCents(line.unitPriceCents)}</td>
              <td className="hidden py-4 text-right tabular-nums sm:table-cell">{formatRate(line.vatRateBp)}</td>
              <td className="py-4 text-right tabular-nums">{formatCents(line.baseCents)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex flex-col gap-8 md:flex-row md:justify-between">
        <div className="flex max-w-[360px] flex-col gap-4 text-small">
          {props.notes && <p className="whitespace-pre-line">{props.notes}</p>}
          {props.iban && (
            <p>
              <span className="text-hodex-gray">Pago por transferencia a</span>
              <br />
              <span className="tabular-nums">{props.iban.replace(/(.{4})(?=.)/g, '$1 ')}</span>
            </p>
          )}
        </div>
        <dl className="flex w-full flex-col text-small md:w-[320px]">
          <div className="flex justify-between border-b border-hodex-line py-2">
            <dt className="text-hodex-gray">Base imponible</dt>
            <dd className="tabular-nums">{formatCents(props.baseCents)}</dd>
          </div>
          {props.vatBreakdown.map((group) => (
            <div key={group.rateBp} className="flex justify-between border-b border-hodex-line py-2">
              <dt className="text-hodex-gray">
                IVA {formatRate(group.rateBp)} s/ {formatCents(group.baseCents)}
              </dt>
              <dd className="tabular-nums">{formatCents(group.vatCents)}</dd>
            </div>
          ))}
          {props.irpfRateBp > 0 && (
            <div className="flex justify-between border-b border-hodex-line py-2">
              <dt className="text-hodex-gray">Retención IRPF {formatRate(props.irpfRateBp)}</dt>
              <dd className="tabular-nums">{formatCents(-props.irpfCents)}</dd>
            </div>
          )}
          <div className="flex items-baseline justify-between pt-4">
            <dt className="text-eyebrow uppercase tracking-eyebrow text-hodex-gray">Total</dt>
            <dd className="font-display text-h3 leading-tight font-light tabular-nums">{formatCents(props.totalCents)}</dd>
          </div>
        </dl>
      </div>

      {(props.footer || props.hash) && (
        <footer className="mt-auto flex flex-col gap-2 border-t border-hodex-line pt-6 text-[11px] text-hodex-gray">
          {props.footer && <p className="whitespace-pre-line">{props.footer}</p>}
          {props.hash && <p className="break-all tabular-nums">Huella: {props.hash}</p>}
        </footer>
      )}
    </article>
  )
}
