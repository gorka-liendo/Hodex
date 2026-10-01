import { useEffect, useRef, useState, type DragEvent } from 'react'
import { Link } from 'react-router-dom'
import { ACCEPTED_FILES, attachmentsApi, formatFileSize, MAX_FILE_BYTES, type Attachment, type ExpenseSuggestion } from '../../api/attachments'
import { ApiError } from '../../api/client'
import { Eyebrow } from '../../components/brand'
import { Notice } from '../../components/Notice'

const linkClass = 'text-small text-hodex-gray underline-offset-4 hover:text-hodex-black hover:underline'

type Reading =
  | { status: 'idle' }
  | { status: 'reading' }
  | { status: 'done'; suggestion: ExpenseSuggestion }
  | { status: 'error'; message: string }

interface Item {
  attachment: Attachment
  reading: Reading
}

const errorMessage = (error: unknown, fallback: string) => (error instanceof ApiError ? error.message : fallback)

/**
 * Justificantes del gasto: se suben al momento y, si la IA está activa, Claude
 * los lee y propone los datos. En un gasto nuevo se aplican solos; al editar,
 * solo si el usuario lo pide. Nada se guarda hasta pulsar "Guardar".
 */
export function ReceiptPanel({
  initial,
  aiEnabled,
  autoApply,
  onChange,
  onSuggestion,
}: {
  /** Justificante ya guardado con el que se abre el formulario (recibido por email). */
  initial?: Attachment
  aiEnabled: boolean
  /** Rellenar el formulario sin preguntar (gasto nuevo). */
  autoApply: boolean
  /** Ids de los adjuntos subidos en este formulario. */
  onChange: (ids: string[]) => void
  onSuggestion: (suggestion: ExpenseSuggestion) => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const [items, setItems] = useState<Item[]>(() =>
    initial ? [{ attachment: initial, reading: aiEnabled ? { status: 'reading' } : { status: 'idle' } }] : [],
  )

  // El justificante recibido ya se leyó al llegar: se recupera esa lectura (sin coste) y se aplica.
  useEffect(() => {
    if (!initial || !aiEnabled) return
    let cancelled = false
    attachmentsApi
      .extract(initial.id)
      .then((suggestion) => {
        if (cancelled) return
        setItems((prev) => prev.map((i) => (i.attachment.id === initial.id ? { ...i, reading: { status: 'done', suggestion } } : i)))
        onSuggestion(suggestion)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const message = errorMessage(err, 'No se pudo leer el documento.')
        setItems((prev) => prev.map((i) => (i.attachment.id === initial.id ? { ...i, reading: { status: 'error', message } } : i)))
      })
    return () => {
      cancelled = true
    }
    // Solo al abrir el formulario.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function update(next: Item[]) {
    setItems(next)
    onChange(next.map((i) => i.attachment.id))
  }

  function setReading(id: string, reading: Reading) {
    setItems((prev) => prev.map((i) => (i.attachment.id === id ? { ...i, reading } : i)))
  }

  async function read(id: string, force = false, apply = autoApply) {
    setReading(id, { status: 'reading' })
    try {
      const suggestion = await attachmentsApi.extract(id, force)
      setReading(id, { status: 'done', suggestion })
      if (apply) onSuggestion(suggestion)
    } catch (err) {
      setReading(id, { status: 'error', message: errorMessage(err, 'No se pudo leer el documento.') })
    }
  }

  async function upload(file: File | undefined) {
    if (!file || uploading) return
    setError(null)
    if (file.size > MAX_FILE_BYTES) {
      setError('El archivo supera los 10 MB.')
      return
    }
    setUploading(true)
    try {
      const attachment = await attachmentsApi.upload(file)
      const isFirst = items.length === 0
      update([...items, { attachment, reading: { status: 'idle' } }])
      // Se lee el primero automáticamente; los siguientes, a petición.
      if (aiEnabled && isFirst) void read(attachment.id)
    } catch (err) {
      setError(errorMessage(err, 'No se pudo subir el archivo.'))
    } finally {
      setUploading(false)
      if (input.current) input.current.value = ''
    }
  }

  async function remove(attachment: Attachment) {
    update(items.filter((i) => i.attachment.id !== attachment.id))
    // Lo recibido por email vuelve a la bandeja; lo subido aquí se borra al momento
    // (si fallara, se limpia solo en 24 h).
    if (attachment.inboundEmailId) return
    await attachmentsApi.remove(attachment.id).catch(() => undefined)
  }

  function onDrop(event: DragEvent) {
    event.preventDefault()
    setDragging(false)
    void upload(event.dataTransfer.files[0])
  }

  return (
    <section className="flex flex-col gap-6">
      <Eyebrow>Ticket o factura</Eyebrow>

      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex flex-col items-start gap-3 border bg-hodex-white p-6 transition-colors ${
          dragging ? 'border-hodex-black' : 'border-hodex-line'
        }`}
      >
        <p className="text-hodex-black">
          {uploading ? (
            'Subiendo…'
          ) : (
            <>
              Arrastra aquí el ticket o la factura, o{' '}
              <button
                type="button"
                onClick={() => input.current?.click()}
                className="underline underline-offset-4 hover:text-hodex-gray"
              >
                elige un archivo
              </button>
              .
            </>
          )}
        </p>
        <p className="text-small text-hodex-gray">
          PDF o foto (JPG, PNG, WebP), hasta 10 MB.
          {aiEnabled && ' Claude lo lee y rellena el gasto por ti; tú solo revisas.'}
        </p>
        <input
          ref={input}
          type="file"
          accept={ACCEPTED_FILES}
          className="sr-only"
          tabIndex={-1}
          aria-label="Ticket o factura"
          onChange={(e) => void upload(e.target.files?.[0])}
        />
      </div>

      {error && <Notice>{error}</Notice>}

      {items.length > 0 && (
        <ul className="border-t border-hodex-line">
          {items.map(({ attachment, reading }, index) => (
            <li key={attachment.id} className="flex flex-col gap-4 border-b border-hodex-line py-4">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                <span className="inline-flex h-8 w-10 items-center justify-center border border-hodex-line text-small">
                  {String(index + 1).padStart(2, '0')}/
                </span>
                <span className="min-w-0 flex-1 truncate">{attachment.filename}</span>
                <span className="text-small text-hodex-gray tabular-nums">{formatFileSize(attachment.sizeBytes)}</span>
                <a href={attachmentsApi.fileUrl(attachment.id)} target="_blank" rel="noopener" className={linkClass}>
                  Ver
                </a>
                <button type="button" className={linkClass} onClick={() => void remove(attachment)}>
                  Quitar
                </button>
              </div>
              {aiEnabled && (
                <ReadingStatus
                  reading={reading}
                  autoApply={autoApply}
                  onRead={(force) => void read(attachment.id, force, force ? autoApply : true)}
                  onApply={(s) => onSuggestion(s)}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function ReadingStatus({
  reading,
  autoApply,
  onRead,
  onApply,
}: {
  reading: Reading
  autoApply: boolean
  onRead: (force: boolean) => void
  onApply: (suggestion: ExpenseSuggestion) => void
}) {
  if (reading.status === 'idle') {
    return (
      <button type="button" className={`${linkClass} self-start`} onClick={() => onRead(false)}>
        Leer con IA y rellenar
      </button>
    )
  }
  if (reading.status === 'reading') {
    return (
      <p className="text-small text-hodex-gray" aria-live="polite">
        Leyendo con IA… puede tardar unos segundos.
      </p>
    )
  }
  if (reading.status === 'error') {
    return (
      <div className="flex flex-col items-start gap-2">
        <Notice>{reading.message}</Notice>
        <button type="button" className={linkClass} onClick={() => onRead(false)}>
          Reintentar
        </button>
      </div>
    )
  }

  const { suggestion } = reading
  const unknownSupplier = suggestion.supplier && !suggestion.supplierId
  return (
    <div className="flex flex-col gap-3" aria-live="polite">
      <p className="text-small">
        <b className="font-semibold text-hodex-black">
          {autoApply ? 'Datos rellenados con IA.' : 'Datos leídos con IA.'}
        </b>{' '}
        <span className="text-hodex-gray">Revísalos antes de guardar.</span>
      </p>
      {unknownSupplier && (
        <p className="text-small text-hodex-gray">
          Proveedor: {[suggestion.supplier!.name, suggestion.supplier!.taxId].filter(Boolean).join(' · ')}.{' '}
          {suggestion.supplierMatch && !suggestion.supplierMatch.isSupplier
            ? `Está en tus contactos como cliente (${suggestion.supplierMatch.legalName}); márcalo también como proveedor para asignarlo.`
            : 'No está en tus contactos.'}{' '}
          {!suggestion.supplierMatch && (
            <Link to="/clientes/nuevo" target="_blank" className="underline underline-offset-4 hover:text-hodex-black">
              Darlo de alta
            </Link>
          )}
        </p>
      )}
      {suggestion.warnings.length > 0 && (
        <ul className="flex flex-col gap-1 border-l border-hodex-black pl-4 text-small text-hodex-black">
          {suggestion.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-6">
        {!autoApply && (
          <button type="button" className={linkClass} onClick={() => onApply(suggestion)}>
            Rellenar el formulario con estos datos
          </button>
        )}
        <button type="button" className={linkClass} onClick={() => onRead(true)}>
          Volver a leer
        </button>
      </div>
    </div>
  )
}
