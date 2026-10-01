import { getResendKey } from '../../services/email.js'
import { MAX_ATTACHMENT_BYTES } from '../attachments/fileType.js'

export interface InboundAttachmentInfo {
  id: string
  filename: string | null
  contentType: string
  disposition: string | null
  size: number | null
  downloadUrl: string
}

const API = 'https://api.resend.com'

/** Adjuntos de un correo recibido (la API devuelve enlaces de descarga temporales). */
export async function listInboundAttachments(emailId: string): Promise<InboundAttachmentInfo[]> {
  const key = getResendKey()
  if (!key) throw new Error('Falta la API key de Resend')
  const res = await fetch(`${API}/emails/receiving/${encodeURIComponent(emailId)}/attachments`, {
    headers: { Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) throw new Error(`Resend API ${res.status}: ${(await res.text()).slice(0, 300)}`)
  const body = (await res.json()) as {
    data?: Array<{ id: string; filename?: string; content_type?: string; content_disposition?: string; size?: number; download_url?: string }>
  }
  return (body.data ?? [])
    .filter((a) => a.download_url)
    .map((a) => ({
      id: a.id,
      filename: a.filename ?? null,
      contentType: a.content_type ?? '',
      disposition: a.content_disposition ?? null,
      size: typeof a.size === 'number' ? a.size : null,
      downloadUrl: a.download_url!,
    }))
}

/**
 * Descarga un adjunto. Solo desde HTTPS de dominios de Resend (el enlace viene
 * de su API, pero así nunca se usa el servidor para pedir otras URLs) y
 * cortando si supera el tamaño máximo.
 */
export async function downloadInboundAttachment(url: string): Promise<Buffer> {
  const parsed = new URL(url)
  if (parsed.protocol !== 'https:' || !(parsed.hostname === 'resend.com' || parsed.hostname.endsWith('.resend.com'))) {
    throw new Error(`URL de descarga no permitida: ${parsed.hostname}`)
  }
  const res = await fetch(parsed, { redirect: 'error', signal: AbortSignal.timeout(30_000) })
  if (!res.ok || !res.body) throw new Error(`Descarga ${res.status}`)

  const chunks: Buffer[] = []
  let total = 0
  for await (const chunk of res.body as unknown as AsyncIterable<Uint8Array>) {
    total += chunk.length
    if (total > MAX_ATTACHMENT_BYTES) throw new Error('Adjunto demasiado grande')
    chunks.push(Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}
