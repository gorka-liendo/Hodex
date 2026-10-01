import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '../../api/client'
import { invoiceKeys, invoicesApi, type Invoice, type InvoiceSharing } from '../../api/invoices'
import { Eyebrow } from '../../components/brand'
import { Button } from '../../components/Button'
import { buttonClasses } from '../../components/buttonStyles'
import { TextAreaField, TextField } from '../../components/fields'
import { Notice } from '../../components/Notice'
import { formatDateTime } from '../../lib/format'
import { formatCents } from '../../lib/money'
import { formatShortDate } from '../../lib/periods'
import { whatsappUrl } from '../../lib/phone'

type Mode = 'idle' | 'email' | 'whatsapp'

const linkClass = 'text-small text-hodex-gray underline-offset-4 hover:text-hodex-black hover:underline'

function defaultMessage(invoice: Invoice): string {
  const issuer = invoice.issuerSnapshot!
  return [
    'Hola,',
    '',
    `Te enviamos la factura ${invoice.fullNumber} por importe de ${formatCents(invoice.totalCents)}${
      invoice.dueDate ? `, con vencimiento el ${formatShortDate(invoice.dueDate)}` : ''
    }. La tienes adjunta en PDF.`,
    '',
    'Un saludo,',
    issuer.tradeName ?? issuer.legalName,
  ].join('\n')
}

/** Envío de una factura emitida por email o WhatsApp, con su historial. */
export function InvoiceSendPanel({ invoice }: { invoice: Invoice }) {
  const queryClient = useQueryClient()
  const [mode, setMode] = useState<Mode>('idle')
  const sharing = useQuery({ queryKey: invoiceKeys.sharing(invoice.id), queryFn: () => invoicesApi.sharing(invoice.id) })
  const refreshSharing = () => void queryClient.invalidateQueries({ queryKey: invoiceKeys.sharing(invoice.id) })

  return (
    <section className="flex flex-col gap-6">
      <Eyebrow>Enviar al cliente</Eyebrow>

      {mode === 'idle' && (
        <div className="flex flex-wrap gap-4">
          <Button variant="dark" onClick={() => setMode('email')}>
            Enviar por email
          </Button>
          <Button variant="outline" onClick={() => setMode('whatsapp')}>
            Enviar por WhatsApp
          </Button>
        </div>
      )}
      {mode === 'email' && <EmailForm invoice={invoice} onDone={refreshSharing} onClose={() => setMode('idle')} />}
      {mode === 'whatsapp' && <WhatsappShare invoice={invoice} onDone={refreshSharing} onClose={() => setMode('idle')} />}

      {sharing.data && (sharing.data.sends.length > 0 || sharing.data.links.length > 0) && (
        <SharingHistory invoiceId={invoice.id} sharing={sharing.data} onChange={refreshSharing} />
      )}
    </section>
  )
}

// ─── Email ───────────────────────────────────────────────────────────────────

function EmailForm({ invoice, onDone, onClose }: { invoice: Invoice; onDone: () => void; onClose: () => void }) {
  const issuer = invoice.issuerSnapshot!
  const [to, setTo] = useState(invoice.clientSnapshot?.email ?? '')
  const [cc, setCc] = useState('')
  const [subject, setSubject] = useState(`Factura ${invoice.fullNumber} · ${issuer.tradeName ?? issuer.legalName}`)
  const [message, setMessage] = useState(() => defaultMessage(invoice))

  const send = useMutation({
    mutationFn: () =>
      invoicesApi.sendEmail(invoice.id, {
        to,
        cc: cc.split(/[,;\s]+/).filter(Boolean),
        subject,
        message,
      }),
    onSuccess: onDone,
  })
  const error = send.error instanceof ApiError ? send.error : null
  const fieldError = (field: string) =>
    error?.issues.find((issue) => issue.path[0] === field)?.message

  if (send.isSuccess) {
    return (
      <div className="flex flex-col items-start gap-4">
        <Notice tone="info">Factura enviada a {to}.</Notice>
        <button type="button" className={linkClass} onClick={onClose}>
          Cerrar
        </button>
      </div>
    )
  }

  return (
    <form
      onSubmit={(e: FormEvent) => {
        e.preventDefault()
        send.mutate()
      }}
      className="flex max-w-[720px] flex-col gap-6 border border-hodex-line bg-hodex-white p-6"
      noValidate
    >
      {error && error.issues.length === 0 && <Notice>{error.message}</Notice>}
      <div className="grid gap-6 md:grid-cols-2">
        <TextField label="Para" type="email" value={to} error={fieldError('to')} onChange={(e) => setTo(e.target.value)} />
        <TextField
          label="Copia (CC)"
          optional
          hint="Separa varias direcciones con comas."
          value={cc}
          error={fieldError('cc')}
          onChange={(e) => setCc(e.target.value)}
        />
      </div>
      <TextField label="Asunto" value={subject} error={fieldError('subject')} onChange={(e) => setSubject(e.target.value)} />
      <TextAreaField
        label="Mensaje"
        rows={8}
        value={message}
        error={fieldError('message')}
        onChange={(e) => setMessage(e.target.value)}
      />
      <p className="text-small text-hodex-gray">Se adjunta el PDF {invoice.fullNumber}.pdf. Las respuestas llegan a {issuer.email ?? 'tu buzón'}.</p>
      <div className="flex items-center gap-6">
        <Button type="submit" variant="dark" loading={send.isPending} loadingLabel="Enviando…">
          Enviar email
        </Button>
        <button type="button" className={linkClass} onClick={onClose}>
          Cancelar
        </button>
      </div>
    </form>
  )
}

// ─── WhatsApp ────────────────────────────────────────────────────────────────

/**
 * Dos pasos: se crea el enlace seguro (servidor) y después se abre WhatsApp con
 * un enlace normal. Así el navegador no bloquea la ventana como emergente.
 */
function WhatsappShare({ invoice, onDone, onClose }: { invoice: Invoice; onDone: () => void; onClose: () => void }) {
  const [phone, setPhone] = useState(invoice.client.phone ?? '')
  const [copied, setCopied] = useState(false)
  const share = useMutation({
    mutationFn: () => invoicesApi.sendWhatsapp(invoice.id, phone || null),
    onSuccess: onDone,
  })
  const error = share.error instanceof ApiError ? share.error : null

  if (share.data) {
    return (
      <div className="flex max-w-[720px] flex-col gap-5 border border-hodex-line bg-hodex-white p-6">
        <p>
          Enlace listo. Caduca el <b className="font-medium">{formatDateTime(share.data.expiresAt)}</b> y puedes revocarlo
          cuando quieras.
        </p>
        <div className="flex flex-wrap items-center gap-6">
          <a href={whatsappUrl(share.data.text, phone)} target="_blank" rel="noopener noreferrer" className={buttonClasses('dark')}>
            Abrir WhatsApp
          </a>
          <button
            type="button"
            className={linkClass}
            onClick={() => {
              void navigator.clipboard.writeText(share.data.url).then(() => setCopied(true))
            }}
          >
            {copied ? 'Enlace copiado' : 'Copiar enlace'}
          </button>
          <button type="button" className={linkClass} onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex max-w-[720px] flex-col gap-6 border border-hodex-line bg-hodex-white p-6">
      <p className="text-hodex-gray">
        Se crea un enlace privado al PDF, válido 7 días, y se abre WhatsApp con el mensaje escrito. Si no indicas
        teléfono, eliges el contacto en WhatsApp.
      </p>
      {error && error.issues.length === 0 && <Notice>{error.message}</Notice>}
      <div className="md:max-w-[360px]">
        <TextField
          label="Teléfono del cliente"
          type="tel"
          optional
          value={phone}
          error={error?.issues.find((i) => i.path[0] === 'phone')?.message}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>
      <div className="flex items-center gap-6">
        <Button variant="dark" loading={share.isPending} loadingLabel="Creando enlace…" onClick={() => share.mutate()}>
          Crear enlace
        </Button>
        <button type="button" className={linkClass} onClick={onClose}>
          Cancelar
        </button>
      </div>
    </div>
  )
}

// ─── Historial ───────────────────────────────────────────────────────────────

function SharingHistory({
  invoiceId,
  sharing,
  onChange,
}: {
  invoiceId: string
  sharing: InvoiceSharing
  onChange: () => void
}) {
  const revoke = useMutation({
    mutationFn: (linkId: string) => invoicesApi.revokeLink(invoiceId, linkId),
    onSuccess: onChange,
  })
  // Hora de referencia fijada al montar (el render debe ser puro).
  const [now] = useState(() => Date.now())

  return (
    <div className="flex flex-col gap-6">
      {sharing.sends.length > 0 && (
        <ul className="border-t border-hodex-line text-small">
          {sharing.sends.map((send) => (
            <li key={send.id} className="flex flex-wrap justify-between gap-2 border-b border-hodex-line py-3">
              <span>
                <span className="text-eyebrow uppercase tracking-eyebrow text-hodex-gray">
                  {send.channel === 'email' ? 'Email' : 'WhatsApp'}
                </span>{' '}
                · {send.recipient ?? 'contacto elegido en WhatsApp'}
              </span>
              <span className="text-hodex-gray">{formatDateTime(send.sentAt)}</span>
            </li>
          ))}
        </ul>
      )}
      {sharing.links.length > 0 && (
        <ul className="border-t border-hodex-line text-small">
          {sharing.links.map((link) => {
            const active = !link.revokedAt && new Date(link.expiresAt).getTime() > now
            return (
              <li key={link.id} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-hodex-line py-3">
                <span>
                  <span className="text-eyebrow uppercase tracking-eyebrow text-hodex-gray">Enlace</span> ·{' '}
                  {link.revokedAt
                    ? 'revocado'
                    : active
                      ? `activo hasta el ${formatDateTime(link.expiresAt)}`
                      : 'caducado'}{' '}
                  · abierto {link.accessCount} {link.accessCount === 1 ? 'vez' : 'veces'}
                </span>
                {active && (
                  <button type="button" className={linkClass} onClick={() => revoke.mutate(link.id)}>
                    {revoke.isPending && revoke.variables === link.id ? 'Revocando…' : 'Revocar'}
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
