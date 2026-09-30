import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import { and, eq } from 'drizzle-orm'
import { createApp } from '../../../app.js'
import { closeDb, getDb } from '../../../db/client.js'
import { auditLog } from '../../../db/schema/index.js'
import { todayInSpain } from '../../../lib/periods.js'
import { hasTestDatabase, migrateTestDatabase } from '../../../test/db.js'
import { PANEL_HEADERS, signedInPanel } from '../../../test/session.js'
import { pdfFilename } from './invoicePdf.service.js'

const app = createApp()

/** `pdftotext` (poppler) si está instalado: permite leer el texto real del PDF. */
const hasPdftotext = (() => {
  try {
    execFileSync('pdftotext', ['-v'], { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
})()

function pdfText(pdf: Buffer): string {
  const file = join(mkdtempSync(join(tmpdir(), 'hodex-pdf-')), 'invoice.pdf')
  writeFileSync(file, pdf)
  return execFileSync('pdftotext', ['-layout', file, '-'], { encoding: 'utf8' })
}

/** Supertest: recibir el cuerpo como binario. */
const binary = (res: request.Response, callback: (err: Error | null, body: Buffer) => void) => {
  const chunks: Buffer[] = []
  res.on('data', (chunk: Buffer) => chunks.push(chunk))
  res.on('end', () => callback(null, Buffer.concat(chunks)))
}

describe('pdfFilename', () => {
  it('usa el número si tiene el formato esperado y, si no, un nombre neutro', () => {
    expect(pdfFilename({ fullNumber: 'F-2026-0001' }, 'abcdef12-0000')).toBe('F-2026-0001.pdf')
    expect(pdfFilename({ fullNumber: null }, 'abcdef12-0000')).toBe('borrador-abcdef12.pdf')
    expect(pdfFilename({ fullNumber: 'F-2026-0001"; x=1' }, 'abcdef12-0000')).toBe('borrador-abcdef12.pdf')
  })
})

describe.skipIf(!hasTestDatabase)('PDF de factura', () => {
  let panel: Awaited<ReturnType<typeof signedInPanel>>
  let clientId: string
  const clientName = `Cliente PDF ${randomUUID().slice(0, 6)} SL`
  const company = {
    legalName: 'Hodex Studio SL',
    tradeName: 'Hodex',
    taxId: 'B12345674',
    addressLine: 'Alameda de Recalde 10',
    postalCode: '48009',
    city: 'Bilbao',
    country: 'ES',
    iban: 'ES9121000418450200051332',
    invoiceFooter: 'Inscrita en el Registro Mercantil de Bizkaia.',
  }

  const getPdf = (id: string) => panel.get(`/invoices/${id}/pdf`).buffer(true).parse(binary)

  beforeAll(async () => {
    await migrateTestDatabase(getDb())
    panel = await signedInPanel(app)
    await panel.put('/settings/company', company).expect(200)
    clientId = (
      await panel.post('/contacts', {
        isClient: true,
        isSupplier: false,
        legalName: clientName,
        country: 'FR',
        taxId: `FR${Date.now()}`,
        addressLine: '1 Rue de Rivoli',
        postalCode: '75001',
        city: 'Paris',
      })
    ).body.id
  })

  afterAll(async () => {
    await closeDb()
  })

  async function issued() {
    const draft = (
      await panel.post('/invoices', {
        clientId,
        issueDate: todayInSpain(),
        irpfRateBp: 1500,
        notes: 'Gracias por confiar en Hodex.',
        lines: [{ description: 'Diseño web', quantityMilli: 32_500, unitPriceCents: 6_500, vatRateBp: 2100 }],
      })
    ).body
    return (await panel.post(`/invoices/${draft.id}/issue`).expect(200)).body
  }

  it('sin sesión no se descarga', async () => {
    const invoice = await issued()
    const res = await request(app).get(`/api/admin/invoices/${invoice.id}/pdf`).set(PANEL_HEADERS)
    expect(res.status).toBe(401)
  })

  it('devuelve un PDF válido como descarga con nombre seguro y queda auditado', async () => {
    const invoice = await issued()
    const res = await getPdf(invoice.id)
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toBe('application/pdf')
    expect(res.headers['content-disposition']).toBe(`attachment; filename="${invoice.fullNumber}.pdf"`)
    expect(res.headers['cache-control']).toBe('no-store')

    const pdf = res.body as Buffer
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-')
    expect(pdf.subarray(-6).toString()).toContain('%%EOF')
    expect(pdf.toString('latin1')).toContain(`Factura ${invoice.fullNumber}`) // título del documento

    const rows = await getDb()
      .select()
      .from(auditLog)
      .where(and(eq(auditLog.action, 'invoice.pdf.download'), eq(auditLog.userId, panel.userId)))
    expect(rows.some((r) => r.metadata?.invoiceId === invoice.id)).toBe(true)
  })

  it.skipIf(!hasPdftotext)('contiene los datos de la factura (texto real del PDF)', async () => {
    const invoice = await issued()
    const text = pdfText((await getPdf(invoice.id)).body as Buffer)
    for (const expected of [
      invoice.fullNumber,
      'Hodex Studio SL',
      'B12345674',
      clientName,
      'Francia',
      'Diseño web',
      '32,5',
      '2112,50 €', // base
      '443,63 €', // IVA 21 %
      '-316,88 €', // retención 15 %
      '2239,25 €', // total = 2112,50 + 443,63 − 316,88
      'ES91 2100 0418 4502 0005 1332',
      'Registro Mercantil',
      invoice.hash,
    ]) {
      expect(text).toContain(expected)
    }
  })

  it.skipIf(!hasPdftotext)('una factura emitida no cambia aunque cambien los datos de la empresa', async () => {
    const invoice = await issued()
    await panel.put('/settings/company', { ...company, legalName: 'Otra Razón Social SL' }).expect(200)
    try {
      const text = pdfText((await getPdf(invoice.id)).body as Buffer)
      expect(text).toContain('Hodex Studio SL')
      expect(text).not.toContain('Otra Razón Social SL')
    } finally {
      await panel.put('/settings/company', company).expect(200)
    }
  })

  it.skipIf(!hasPdftotext)('un borrador se marca como tal y no tiene número', async () => {
    const draft = (
      await panel.post('/invoices', {
        clientId,
        issueDate: todayInSpain(),
        lines: [{ description: 'Borrador', quantityMilli: 1_000, unitPriceCents: 100, vatRateBp: 2100 }],
      })
    ).body
    const res = await getPdf(draft.id)
    expect(res.headers['content-disposition']).toBe(`attachment; filename="borrador-${draft.id.slice(0, 8)}.pdf"`)
    const text = pdfText(res.body as Buffer)
    expect(text).toContain('Borrador') // en lugar del número
    // Las etiquetas con tracking ancho se extraen con letras separadas: se compara sin espacios.
    expect(text.replace(/\s/g, '')).toContain('BORRADORSINVALIDEZFISCAL')
  })
})
