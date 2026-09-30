import { createRequire } from 'node:module'
import PDFDocument from 'pdfkit'
import type { PartySnapshot } from '../../../db/schema/index.js'
import { formatCountry, formatDate, formatEuros, formatQuantity, formatRate } from '../../../lib/format.js'

/**
 * PDF de una factura con la identidad de Hodex: blanco y negro, hairlines,
 * cifras finas (Onest incrustada) e isotipo vectorial. Generado en el servidor
 * con pdfkit (sin navegador headless: imagen ligera y menos superficie).
 */

// ─── Marca ───────────────────────────────────────────────────────────────────

const BLACK = '#111010'
const GRAY = '#6E6E6E'
const LIGHT_GRAY = '#A6A6A6'
const HAIRLINE_OPACITY = 0.14

const require = createRequire(import.meta.url)
const FONTS = {
  light: require.resolve('@fontsource/onest/files/onest-latin-300-normal.woff'),
  regular: require.resolve('@fontsource/onest/files/onest-latin-400-normal.woff'),
  medium: require.resolve('@fontsource/onest/files/onest-latin-500-normal.woff'),
}

/** Isotipo (mismo trazado que el favicon), viewBox 77.005 × 69.672. */
const ISOTYPE_PATH =
  'M23.754,0c0.346,0.32,0.193,0.863,0.193,1.254c0.001,14.103-0.081,28.975,0.096,43.123c0.956-0.285,1.627-1.014,2.361-1.592c3.602-2.828,7.016-5.842,10.696-8.816c1.328-1.072,2.874-2.707,4.674-3.131c2.41-0.57,3.842,1.476,4.626,3.035c0.93,1.85,1.6,3.719,2.36,5.443c0.75,1.703,1.531,3.67,2.312,5.494c0.793,1.848,1.643,4.223,3.47,4.914c1.407,0.533,3.582,0.211,5.3,0.289c5.748,0.26,11.533-0.18,17.152,0.096c0.097,0.533-0.602,0.939-0.964,1.301c-4.395,4.395-8.816,8.961-13.25,13.395c-1.622,1.621-3.104,3.375-4.817,4.867c-4.387-0.018-8.315-0.049-12.721-0.049c-2.233,0-4.316,0.191-5.975-0.338c-1.601-0.51-2.825-1.447-3.661-2.746c-1.708-2.65-2.849-5.627-4.24-8.576c-1.011-2.143-2.047-4.34-3.084-6.553c-0.652-1.391-1.211-3.24-3.131-3.373c-1.577,0.285-2.672,1.418-3.759,2.314c-0.953,0.783-1.761,1.691-2.746,2.359c-3.741,3.102-7.424,6.26-11.226,9.299c-1.414,1.088-2.646,2.393-4.191,3.518c-0.491,0.357-1.071,0.824-1.783,0.771c-1.544-0.117-1.445-1.877-1.445-3.758c0-13.815,0.061-29.18,0.097-42.496c0.262-0.615,0.859-1.002,1.349-1.399c1.48-1.199,2.94-2.486,4.433-3.709c2.947-2.463,5.919-4.891,8.865-7.42c2.153-1.85,4.555-3.57,6.602-5.59C22.069,1.215,22.969,0.605,23.754,0z'
const ISOTYPE_HEIGHT = 69.672

// ─── Datos ───────────────────────────────────────────────────────────────────

export interface InvoicePdfData {
  /** null = borrador (se marca como tal, sin validez fiscal). */
  fullNumber: string | null
  kind: 'standard' | 'rectifying'
  issueDate: string
  dueDate: string | null
  issuer: PartySnapshot
  client: PartySnapshot
  lines: Array<{ description: string; quantityMilli: number; unitPriceCents: number; vatRateBp: number; baseCents: number }>
  vatBreakdown: Array<{ rateBp: number; baseCents: number; vatCents: number }>
  baseCents: number
  irpfRateBp: number
  irpfCents: number
  totalCents: number
  notes: string | null
  rectifies: { fullNumber: string | null; reason: string | null } | null
  hash: string | null
  issuedAt: Date | null
}

// ─── Maquetación ─────────────────────────────────────────────────────────────

const PAGE = { width: 595.28, height: 841.89 } // A4 en puntos
const MARGIN = 56
const CONTENT_WIDTH = PAGE.width - MARGIN * 2
const FOOTER_HEIGHT = 64
const BOTTOM_LIMIT = PAGE.height - MARGIN - FOOTER_HEIGHT

/** Columnas de la tabla de conceptos (x relativo al margen y ancho). */
const COLUMNS = {
  description: { x: 0, width: 239 },
  quantity: { x: 247, width: 48 },
  price: { x: 303, width: 68 },
  vat: { x: 379, width: 36 },
  amount: { x: 423, width: CONTENT_WIDTH - 423 },
}

type Doc = PDFKit.PDFDocument

function hairline(doc: Doc, y: number, x1 = MARGIN, x2 = PAGE.width - MARGIN) {
  doc.save().moveTo(x1, y).lineTo(x2, y).lineWidth(0.5).strokeColor(BLACK).strokeOpacity(HAIRLINE_OPACITY).stroke().restore()
}

/** Etiqueta en mayúsculas con tracking ancho (el "eyebrow" de la marca). */
function eyebrow(doc: Doc, text: string, x: number, y: number, options: PDFKit.Mixins.TextOptions = {}) {
  doc.font('regular').fontSize(6.5).fillColor(GRAY).text(text.toUpperCase(), x, y, { characterSpacing: 1.3, lineBreak: false, ...options })
}

function partyLines(party: PartySnapshot): string[] {
  return [
    party.taxId ? `NIF ${party.taxId}` : null,
    party.addressLine,
    [party.postalCode, party.city].filter(Boolean).join(' ') || null,
    party.province,
    party.country !== 'ES' ? formatCountry(party.country) : null,
    party.email,
  ].filter((line): line is string => Boolean(line))
}

function drawParty(doc: Doc, title: string, party: PartySnapshot, x: number, y: number, width: number): number {
  eyebrow(doc, title, x, y)
  let cursor = y + 16
  doc.font('medium').fontSize(9).fillColor(BLACK).text(party.legalName, x, cursor, { width })
  cursor += doc.heightOfString(party.legalName, { width }) + 3
  doc.font('regular').fontSize(8.5).fillColor(BLACK)
  for (const line of partyLines(party)) {
    doc.text(line, x, cursor, { width })
    cursor += doc.heightOfString(line, { width }) + 2
  }
  return cursor
}

function drawTableHeader(doc: Doc, y: number): number {
  eyebrow(doc, 'Concepto', MARGIN + COLUMNS.description.x, y)
  eyebrow(doc, 'Cant.', MARGIN + COLUMNS.quantity.x, y, { width: COLUMNS.quantity.width, align: 'right' })
  eyebrow(doc, 'Precio', MARGIN + COLUMNS.price.x, y, { width: COLUMNS.price.width, align: 'right' })
  eyebrow(doc, 'IVA', MARGIN + COLUMNS.vat.x, y, { width: COLUMNS.vat.width, align: 'right' })
  eyebrow(doc, 'Importe', MARGIN + COLUMNS.amount.x, y, { width: COLUMNS.amount.width, align: 'right' })
  hairline(doc, y + 14)
  return y + 24
}

function drawHeader(doc: Doc, data: InvoicePdfData): number {
  // Isotipo + nombre comercial.
  const scale = 20 / ISOTYPE_HEIGHT
  doc.save().translate(MARGIN, MARGIN).scale(scale).path(ISOTYPE_PATH).fill(BLACK).restore()
  doc.font('light').fontSize(17).fillColor(BLACK).text(data.issuer.tradeName ?? 'Hodex', MARGIN + 30, MARGIN + 1, { lineBreak: false })

  // Tipo, número y fechas, alineados a la derecha.
  const right = { width: CONTENT_WIDTH, align: 'right' as const }
  const title = data.kind === 'rectifying' ? 'Factura rectificativa' : 'Factura'
  eyebrow(doc, data.fullNumber ? title : `${title} · Borrador sin validez fiscal`, MARGIN, MARGIN, right)
  doc.font('light').fontSize(20).fillColor(BLACK).text(data.fullNumber ?? 'Borrador', MARGIN, MARGIN + 11, { ...right, lineBreak: false })
  doc.font('regular').fontSize(8.5).fillColor(GRAY)
  doc.text(`Fecha ${formatDate(data.issueDate)}`, MARGIN, MARGIN + 40, right)
  if (data.dueDate) doc.text(`Vencimiento ${formatDate(data.dueDate)}`, MARGIN, MARGIN + 52, right)

  let y = MARGIN + 80
  if (data.rectifies) {
    const text = `Rectifica la factura ${data.rectifies.fullNumber ?? ''}${data.rectifies.reason ? ` · Motivo: ${data.rectifies.reason}` : ''}`
    doc.save().moveTo(MARGIN, y).lineTo(MARGIN, y + 12).lineWidth(0.75).strokeColor(BLACK).stroke().restore()
    doc.font('regular').fontSize(8.5).fillColor(BLACK).text(text, MARGIN + 10, y + 1, { width: CONTENT_WIDTH - 10 })
    y += doc.heightOfString(text, { width: CONTENT_WIDTH - 10 }) + 16
  }

  // Emisor y cliente.
  hairline(doc, y)
  const columnWidth = CONTENT_WIDTH / 2 - 16
  const leftEnd = drawParty(doc, 'Emisor', data.issuer, MARGIN, y + 20, columnWidth)
  const rightEnd = drawParty(doc, 'Cliente', data.client, MARGIN + CONTENT_WIDTH / 2 + 16, y + 20, columnWidth)
  y = Math.max(leftEnd, rightEnd) + 16
  hairline(doc, y)
  return y + 24
}

function drawLines(doc: Doc, data: InvoicePdfData, startY: number): number {
  let y = drawTableHeader(doc, startY)
  doc.font('regular').fontSize(8.5).fillColor(BLACK)

  for (const line of data.lines) {
    const descriptionHeight = doc.heightOfString(line.description, { width: COLUMNS.description.width })
    const rowHeight = Math.max(descriptionHeight, 11) + 14
    if (y + rowHeight > BOTTOM_LIMIT) {
      doc.addPage()
      y = drawTableHeader(doc, MARGIN)
      doc.font('regular').fontSize(8.5).fillColor(BLACK)
    }
    const cell = (text: string, column: { x: number; width: number }) =>
      doc.text(text, MARGIN + column.x, y + 6, { width: column.width, align: 'right', lineBreak: false })
    doc.text(line.description, MARGIN + COLUMNS.description.x, y + 6, { width: COLUMNS.description.width })
    cell(formatQuantity(line.quantityMilli), COLUMNS.quantity)
    cell(formatEuros(line.unitPriceCents), COLUMNS.price)
    cell(formatRate(line.vatRateBp), COLUMNS.vat)
    cell(formatEuros(line.baseCents), COLUMNS.amount)
    y += rowHeight
    hairline(doc, y)
  }
  return y + 20
}

function drawTotals(doc: Doc, data: InvoicePdfData, startY: number) {
  const width = 220
  const x = PAGE.width - MARGIN - width
  const rows: Array<[string, string]> = [
    ['Base imponible', formatEuros(data.baseCents)],
    ...data.vatBreakdown.map(
      (g): [string, string] => [`IVA ${formatRate(g.rateBp)} s/ ${formatEuros(g.baseCents)}`, formatEuros(g.vatCents)],
    ),
    ...(data.irpfRateBp > 0 ? [[`Retención IRPF ${formatRate(data.irpfRateBp)}`, formatEuros(-data.irpfCents)] as [string, string]] : []),
  ]
  // Notas + IBAN a la izquierda.
  const leftWidth = CONTENT_WIDTH - width - 32
  const blockHeight = rows.length * 20 + 44
  const notesHeight =
    (data.notes ? doc.font('regular').fontSize(8.5).heightOfString(data.notes, { width: leftWidth }) + 12 : 0) +
    (data.issuer.iban ? 32 : 0)
  let y = startY
  if (y + Math.max(blockHeight, notesHeight) > BOTTOM_LIMIT) {
    doc.addPage()
    y = MARGIN
  }

  let leftY = y
  if (data.notes) {
    doc.font('regular').fontSize(8.5).fillColor(BLACK).text(data.notes, MARGIN, leftY, { width: leftWidth })
    leftY += doc.heightOfString(data.notes, { width: leftWidth }) + 12
  }
  if (data.issuer.iban) {
    doc.font('regular').fontSize(8).fillColor(GRAY).text('Pago por transferencia a', MARGIN, leftY)
    doc.font('regular').fontSize(8.5).fillColor(BLACK).text(data.issuer.iban.replace(/(.{4})(?=.)/g, '$1 '), MARGIN, leftY + 12)
  }

  let rowY = y
  for (const [label, value] of rows) {
    doc.font('regular').fontSize(8).fillColor(GRAY).text(label, x, rowY, { width: width - 80, lineBreak: false })
    doc.font('regular').fontSize(8.5).fillColor(BLACK).text(value, x, rowY, { width, align: 'right', lineBreak: false })
    rowY += 14
    hairline(doc, rowY, x, x + width)
    rowY += 6
  }
  eyebrow(doc, 'Total', x, rowY + 12)
  doc.font('light').fontSize(18).fillColor(BLACK).text(formatEuros(data.totalCents), x, rowY + 4, { width, align: 'right', lineBreak: false })
}

/** Pie en todas las páginas: texto legal, huella y número de página. */
function drawFooters(doc: Doc, data: InvoicePdfData) {
  const range = doc.bufferedPageRange()
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i)
    // El pie va por debajo del margen inferior: evita que pdfkit abra otra página.
    const originalBottom = doc.page.margins.bottom
    doc.page.margins.bottom = 0
    const top = PAGE.height - MARGIN - FOOTER_HEIGHT + 20
    hairline(doc, top)
    let y = top + 8
    const width = CONTENT_WIDTH - 60
    const footer = data.issuer.invoiceFooter
    if (footer) {
      doc.font('regular').fontSize(6.5).fillColor(GRAY).text(footer, MARGIN, y, { width, height: 22, ellipsis: true })
      y += Math.min(doc.heightOfString(footer, { width }), 22) + 4
    }
    if (data.hash) {
      doc.font('regular').fontSize(6).fillColor(LIGHT_GRAY).text(`Huella ${data.hash}`, MARGIN, y, { width, lineBreak: false })
    }
    doc.font('regular').fontSize(6.5).fillColor(GRAY).text(`${i + 1} / ${range.count}`, MARGIN, top + 8, {
      width: CONTENT_WIDTH,
      align: 'right',
      lineBreak: false,
    })
    // Cabecera corrida en las páginas de continuación: cada hoja se identifica sola.
    if (i > range.start) {
      const label = `${data.issuer.tradeName ?? 'Hodex'} · ${data.fullNumber ? `Factura ${data.fullNumber}` : 'Borrador de factura'} · continuación`
      eyebrow(doc, label, MARGIN, MARGIN - 28)
    }
    // Marca de agua en borradores: no puede confundirse con una factura real.
    if (!data.fullNumber) {
      doc.save().rotate(-35, { origin: [PAGE.width / 2, PAGE.height / 2] })
      doc.font('light').fontSize(72).fillColor(BLACK).fillOpacity(0.05)
      doc.text('BORRADOR', 0, PAGE.height / 2 - 40, { width: PAGE.width, align: 'center', lineBreak: false })
      doc.restore()
    }
    doc.page.margins.bottom = originalBottom
  }
}

/** Genera el PDF y lo devuelve en memoria (unas decenas de KB). */
export function renderInvoicePdf(data: InvoicePdfData): Promise<Buffer> {
  const title = data.fullNumber ? `Factura ${data.fullNumber}` : 'Borrador de factura'
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
    bufferPages: true,
    lang: 'es-ES',
    info: {
      Title: title,
      Author: data.issuer.legalName,
      Subject: `${title} · ${data.client.legalName}`,
      Creator: 'Hodex',
      Producer: 'Hodex',
      // Fecha de emisión (no la de generación): el mismo PDF siempre es igual.
      CreationDate: data.issuedAt ?? new Date(),
    },
  })
  doc.registerFont('light', FONTS.light)
  doc.registerFont('regular', FONTS.regular)
  doc.registerFont('medium', FONTS.medium)

  const chunks: Buffer[] = []
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
  })

  const afterHeader = drawHeader(doc, data)
  const afterLines = drawLines(doc, data, afterHeader)
  drawTotals(doc, data, afterLines)
  drawFooters(doc, data)
  doc.end()
  return done
}
