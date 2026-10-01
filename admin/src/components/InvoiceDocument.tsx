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

/** Etiqueta pequeña en mayúsculas con tracking (eyebrow de la marca). */
function Label({ children, className = '' }: { children: string; className?: string }) {
  return <span className={`text-[9px] uppercase tracking-eyebrow text-hodex-gray ${className}`}>{children}</span>
}

function PartyBlock({ title, party }: { title: string; party: Party }) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="mb-1">{title}</Label>
      {party ? (
        <>
          <span className="text-[14px] font-medium text-hodex-black">{party.legalName}</span>
          <span className="flex flex-col text-[12px] leading-[1.6] text-hodex-gray">
            {party.taxId && <span className="tabular-nums">NIF {party.taxId}</span>}
            {party.addressLine && <span>{party.addressLine}</span>}
            {(party.postalCode || party.city) && <span>{[party.postalCode, party.city].filter(Boolean).join(' ')}</span>}
            {(party.province || party.country !== 'ES') && (
              <span>{[party.province, party.country !== 'ES' && countryName(party.country)].filter(Boolean).join(', ')}</span>
            )}
            {party.email && <span>{party.email}</span>}
          </span>
        </>
      ) : (
        <span className="text-hodex-gray">Completa los datos en Ajustes → Empresa</span>
      )}
    </div>
  )
}

/**
 * La factura tal y como se entrega, en hoja A4 y con el MISMO diseño que el
 * PDF (backend/src/modules/invoices/pdf/invoicePdf.ts): título display fino,
 * rejilla de datos clave, filas numeradas, total en banda negra y wordmark a
 * sangre. Márgenes laterales de 40 pt sobre 595 (6,7 % del ancho).
 */
export function InvoiceDocument(props: InvoiceDocumentProps) {
  const title = props.kind === 'rectifying' ? 'Factura rectificativa' : 'Factura'
  const grid: Array<[string, string, boolean]> = [
    ['Número', props.fullNumber ?? 'Borrador', false],
    ['Fecha', formatShortDate(props.issueDate), false],
    ['Vencimiento', props.dueDate ? formatShortDate(props.dueDate) : '—', false],
    ['Total', formatCents(props.totalCents), true],
  ]

  return (
    <article className="relative mx-auto flex aspect-[210/297] w-full max-w-[794px] flex-col overflow-hidden border border-hodex-line bg-hodex-white px-[6.7%] pt-[6.7%] pb-[15%] text-hodex-black shadow-[0_8px_30px_rgba(17,16,16,0.06)]">
      {/* Cabecera */}
      <div className="flex items-center gap-2.5">
        <Isotype className="h-6 w-auto" />
        <span className="font-display text-xl font-light tracking-headline">{props.issuer?.tradeName ?? 'Hodex'}</span>
      </div>
      <h2 className="mt-8 font-display text-[clamp(32px,6vw,52px)] leading-tight font-light">{title}</h2>
      {!props.fullNumber && <Label className="mt-3 text-hodex-black">Borrador · sin validez fiscal</Label>}

      {/* Rejilla de datos clave */}
      <dl className="mt-6 grid grid-cols-2 border-t border-hodex-black sm:grid-cols-4">
        {grid.map(([label, value, emphasis], i) => (
          <div
            key={label}
            className={`flex flex-col gap-1.5 border-b border-hodex-line py-3 ${i > 0 ? 'sm:border-l sm:pl-4' : ''} ${i % 2 === 1 ? 'border-l pl-4' : ''}`}
          >
            <dt>
              <Label>{label}</Label>
            </dt>
            <dd className={`text-[14px] tabular-nums ${emphasis ? 'font-medium' : ''}`}>{value}</dd>
          </div>
        ))}
      </dl>

      {props.rectifies && (
        <p className="mt-5 border-l border-hodex-black pl-3 text-[12px]">
          Rectifica la factura <b className="font-medium">{props.rectifies.fullNumber}</b>
          {props.rectifies.reason && <> · Motivo: {props.rectifies.reason}</>}
        </p>
      )}

      {/* Partes */}
      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <PartyBlock title="Emisor" party={props.issuer} />
        <PartyBlock title="Facturar a" party={props.client} />
      </div>

      {/* Conceptos */}
      <table className="mt-10 w-full text-[12px]">
        <thead>
          <tr className="border-b border-hodex-black text-left">
            <th className="w-7 pb-2" />
            <th className="pb-2 font-normal"><Label>Concepto</Label></th>
            <th className="pb-2 text-right font-normal"><Label>Cant.</Label></th>
            <th className="hidden pb-2 text-right font-normal sm:table-cell"><Label>Precio</Label></th>
            <th className="hidden pb-2 text-right font-normal sm:table-cell"><Label>IVA</Label></th>
            <th className="pb-2 text-right font-normal"><Label>Importe</Label></th>
          </tr>
        </thead>
        <tbody>
          {props.lines.length === 0 && (
            <tr>
              <td />
              <td colSpan={5} className="py-5 text-hodex-gray">Sin conceptos todavía.</td>
            </tr>
          )}
          {props.lines.map((line, i) => (
            <tr key={i} className="border-b border-hodex-line align-baseline">
              <td className="py-3 text-[10px] text-hodex-gray-light tabular-nums">{String(i + 1).padStart(2, '0')}</td>
              <td className="py-3 pr-4">{line.description}</td>
              <td className="py-3 text-right tabular-nums">{milliToInput(line.quantityMilli)}</td>
              <td className="hidden py-3 pl-3 text-right tabular-nums sm:table-cell">{formatCents(line.unitPriceCents)}</td>
              <td className="hidden py-3 pl-3 text-right tabular-nums sm:table-cell">{formatRate(line.vatRateBp)}</td>
              <td className="py-3 pl-3 text-right tabular-nums">{formatCents(line.baseCents)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pago y notas · desglose y total */}
      <div className="mt-8 flex flex-col gap-8 sm:flex-row sm:justify-between">
        <div className="flex max-w-[300px] flex-col gap-6 text-[12px]">
          {props.iban && (
            <div className="flex flex-col gap-1">
              <Label>Forma de pago</Label>
              <span className="text-hodex-gray">Transferencia bancaria</span>
              <span className="text-[14px] font-medium tabular-nums tracking-[0.02em]">{props.iban.replace(/(.{4})(?=.)/g, '$1 ')}</span>
              {props.dueDate && <span className="text-hodex-gray">Antes del {formatShortDate(props.dueDate)}</span>}
            </div>
          )}
          {props.notes && (
            <div className="flex flex-col gap-1">
              <Label>Notas</Label>
              <p className="whitespace-pre-line">{props.notes}</p>
            </div>
          )}
        </div>
        <div className="flex w-full flex-col sm:w-[42%]">
          <dl className="flex flex-col text-[12px]">
            <div className="flex justify-between border-b border-hodex-line py-2">
              <dt className="text-hodex-gray">Base imponible</dt>
              <dd className="tabular-nums">{formatCents(props.baseCents)}</dd>
            </div>
            {props.vatBreakdown.map((group) => (
              <div key={group.rateBp} className="flex justify-between gap-3 border-b border-hodex-line py-2">
                <dt className="text-hodex-gray">IVA {formatRate(group.rateBp)} s/ {formatCents(group.baseCents)}</dt>
                <dd className="tabular-nums">{formatCents(group.vatCents)}</dd>
              </div>
            ))}
            {props.irpfRateBp > 0 && (
              <div className="flex justify-between border-b border-hodex-line py-2">
                <dt className="text-hodex-gray">Retención IRPF {formatRate(props.irpfRateBp)}</dt>
                <dd className="tabular-nums">{formatCents(-props.irpfCents)}</dd>
              </div>
            )}
          </dl>
          {/* Total a pagar: banda negra */}
          <div className="mt-3 flex items-center justify-between bg-hodex-black px-4 py-3 text-hodex-white">
            <Label className="text-hodex-white">Total a pagar</Label>
            <span className="font-display text-[22px] font-light tabular-nums">{formatCents(props.totalCents)}</span>
          </div>
        </div>
      </div>

      {/* Pie: texto legal y huella, empujado al final de la hoja */}
      {(props.footer || props.hash) && (
        <footer className="mt-auto flex flex-col gap-1.5 border-t border-hodex-line pt-3 text-[9px] text-hodex-gray">
          {props.footer && <p className="whitespace-pre-line">{props.footer}</p>}
          {props.hash && <p className="break-all tabular-nums text-hodex-gray-light">Huella {props.hash}</p>}
        </footer>
      )}

      {/* Wordmark HODEX a sangre, cortado por el canto inferior */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-[6%] left-[5%] font-display text-[clamp(90px,19vw,200px)] leading-none font-extralight tracking-wordmark whitespace-nowrap text-hodex-black/[0.045] select-none"
      >
        HODEX
      </span>
    </article>
  )
}
