/**
 * Comprueba que los tokens de marca del panel son idénticos a los de la landing
 * (frontend/src/index.css es la fuente de verdad). Compara el bloque que va
 * desde `@theme {` hasta antes de la sección Base.
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function extractTokens(css) {
  const start = css.indexOf('@theme {')
  const end = css.indexOf('/* ===== Base')
  const block = css.slice(start, end === -1 ? undefined : end)
  if (start === -1) throw new Error('No se encontró el bloque @theme')
  return block.trim()
}

const source = extractTokens(readFileSync(resolve(root, '../frontend/src/index.css'), 'utf8'))
const copy = extractTokens(readFileSync(resolve(root, 'src/styles/tokens.css'), 'utf8'))

if (source !== copy) {
  console.error(
    '✗ admin/src/styles/tokens.css no coincide con frontend/src/index.css.\n' +
      '  Copia el bloque @theme y las utilidades de marca desde el frontend.',
  )
  process.exit(1)
}
console.log('✓ Tokens de marca sincronizados con la landing.')
