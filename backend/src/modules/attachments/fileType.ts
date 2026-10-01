/** Tipos admitidos: los que Claude sabe leer y el navegador sabe mostrar. */
export const ATTACHMENT_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'] as const
export type AttachmentType = (typeof ATTACHMENT_TYPES)[number]

export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024

const startsWith = (data: Buffer, bytes: number[], offset = 0) =>
  data.length >= offset + bytes.length && bytes.every((b, i) => data[offset + i] === b)

/**
 * Tipo según los primeros bytes del archivo ("magic numbers"). No se fía de la
 * extensión ni de la cabecera Content-Type: un HTML disfrazado de PDF no pasa.
 */
export function detectFileType(data: Buffer): AttachmentType | null {
  if (startsWith(data, [0x25, 0x50, 0x44, 0x46, 0x2d])) return 'application/pdf' // %PDF-
  if (startsWith(data, [0xff, 0xd8, 0xff])) return 'image/jpeg'
  if (startsWith(data, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png'
  if (startsWith(data, [0x52, 0x49, 0x46, 0x46]) && startsWith(data, [0x57, 0x45, 0x42, 0x50], 8)) return 'image/webp'
  return null
}

const EXTENSIONS: Record<AttachmentType, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

/**
 * Nombre de archivo seguro para guardar y servir: sin rutas, sin caracteres de
 * control ni comillas, acotado, y con la extensión del tipo real.
 */
export function safeFilename(raw: string | undefined, type: AttachmentType): string {
  let name = raw ?? ''
  try {
    name = decodeURIComponent(name)
  } catch {
    // Codificación rota: se usa tal cual y se limpia abajo.
  }
  const base = name
    .split(/[\\/]/)
    .pop()!
    .replace(/[\u0000-\u001f\u007f"<>|*?:]/g, '')
    .replace(/\.[A-Za-z0-9]{1,5}$/, '')
    .trim()
    .slice(0, 100)
  return `${base || 'documento'}.${EXTENSIONS[type]}`
}
