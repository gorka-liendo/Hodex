import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ACCEPTED_FILES, attachmentsApi, formatFileSize, MAX_FILE_BYTES, type Attachment } from '../../api/attachments'
import { ApiError } from '../../api/client'
import { expenseKeys, expensesApi, type Expense } from '../../api/expenses'
import { Eyebrow } from '../../components/brand'
import { Button } from '../../components/Button'
import { Notice } from '../../components/Notice'
import { ReauthPrompt } from '../../components/ReauthPrompt'

const linkClass = 'text-small text-hodex-gray underline-offset-4 hover:text-hodex-black hover:underline'

/** Justificantes de un gasto guardado: verlos, añadir otros y quitarlos (con 2FA). */
export function ExpenseAttachments({ expense }: { expense: Expense }) {
  const queryClient = useQueryClient()
  const input = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [pendingRemoval, setPendingRemoval] = useState<string | null>(null)
  const [needsReauth, setNeedsReauth] = useState(false)
  const files = expense.attachments ?? []

  const refresh = () => void queryClient.invalidateQueries({ queryKey: expenseKeys.detail(expense.id) })

  const add = useMutation({
    mutationFn: async (file: File) => {
      const attachment = await attachmentsApi.upload(file)
      return expensesApi.attach(expense.id, [attachment.id])
    },
    onSuccess: (saved) => queryClient.setQueryData(expenseKeys.detail(expense.id), saved),
    onError: (err) => setError(err instanceof ApiError ? err.message : 'No se pudo subir el archivo.'),
  })

  const remove = useMutation({
    mutationFn: (id: string) => attachmentsApi.remove(id),
    onSuccess: () => {
      setPendingRemoval(null)
      refresh()
    },
    onError: (err) => {
      if (err instanceof ApiError && err.code === 'ReauthRequired') setNeedsReauth(true)
      else setError(err instanceof ApiError ? err.message : 'No se pudo quitar el archivo.')
    },
  })

  function pick(file: File | undefined) {
    if (input.current) input.current.value = ''
    if (!file) return
    setError(null)
    if (file.size > MAX_FILE_BYTES) setError('El archivo supera los 10 MB.')
    else add.mutate(file)
  }

  return (
    <section className="flex flex-col gap-6">
      <Eyebrow>Justificantes</Eyebrow>

      {files.length > 0 ? (
        <ul className="border-t border-hodex-line">
          {files.map((file: Attachment) => (
            <li key={file.id} className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-hodex-line py-4">
              {file.contentType.startsWith('image/') ? (
                <img
                  src={attachmentsApi.fileUrl(file.id)}
                  alt=""
                  className="h-12 w-12 border border-hodex-line object-cover"
                />
              ) : (
                <span className="inline-flex h-12 w-12 items-center justify-center border border-hodex-line text-eyebrow uppercase tracking-eyebrow text-hodex-gray">
                  PDF
                </span>
              )}
              <span className="min-w-0 flex-1 truncate">{file.filename}</span>
              <span className="text-small text-hodex-gray tabular-nums">{formatFileSize(file.sizeBytes)}</span>
              <a href={attachmentsApi.fileUrl(file.id)} target="_blank" rel="noopener" className={linkClass}>
                Ver
              </a>
              {pendingRemoval === file.id ? (
                <span className="flex items-center gap-4">
                  <button
                    type="button"
                    className="text-small text-hodex-black underline underline-offset-4"
                    onClick={() => remove.mutate(file.id)}
                  >
                    {remove.isPending ? 'Quitando…' : 'Sí, quitar'}
                  </button>
                  <button type="button" className={linkClass} onClick={() => setPendingRemoval(null)}>
                    Cancelar
                  </button>
                </span>
              ) : (
                <button type="button" className={linkClass} onClick={() => setPendingRemoval(file.id)}>
                  Quitar
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-hodex-gray">Sin ticket ni factura adjunta.</p>
      )}

      {needsReauth && pendingRemoval && (
        <ReauthPrompt
          onConfirmed={() => {
            setNeedsReauth(false)
            remove.mutate(pendingRemoval)
          }}
          onCancel={() => {
            setNeedsReauth(false)
            setPendingRemoval(null)
          }}
        />
      )}

      <div className="flex flex-col items-start gap-4">
        <Button variant="outline" loading={add.isPending} loadingLabel="Subiendo…" onClick={() => input.current?.click()}>
          Adjuntar archivo
        </Button>
        <input
          ref={input}
          type="file"
          accept={ACCEPTED_FILES}
          className="sr-only"
          tabIndex={-1}
          aria-label="Adjuntar archivo"
          onChange={(e) => pick(e.target.files?.[0])}
        />
        {error && <Notice>{error}</Notice>}
      </div>
    </section>
  )
}
