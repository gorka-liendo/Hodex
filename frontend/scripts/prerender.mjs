// Genera un HTML completo por página a partir de dist/index.html (plantilla)
// y del render en servidor (dist-server/entry-server.js). También escribe el
// sitemap con las páginas indexables. Se ejecuta al final de `npm run build`.
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const root = path.resolve(import.meta.dirname, '..')
const dist = path.join(root, 'dist')
const serverEntry = path.join(root, 'dist-server', 'entry-server.js')

const { render, pages, llmsTxt } = await import(pathToFileURL(serverEntry).href)
const template = await readFile(path.join(dist, 'index.html'), 'utf8')
if (!template.includes('<!--app-head-->') || !template.includes('<!--app-html-->')) {
  throw new Error('La plantilla dist/index.html no tiene los huecos <!--app-head--> y <!--app-html-->')
}

for (const meta of pages) {
  const { html, head } = render(meta)
  const page = template.replace('<!--app-head-->', head).replace('<!--app-html-->', html)
  // /servicios/diseno-web → dist/servicios/diseno-web.html (Vercel: cleanUrls).
  const file = meta.path === '/' ? 'index.html' : `${meta.path.slice(1)}.html`
  await mkdir(path.dirname(path.join(dist, file)), { recursive: true })
  await writeFile(path.join(dist, file), page)
  console.log(`  ✓ ${meta.path.padEnd(36)} ${file}`)
}

const lastmod = new Date().toISOString().slice(0, 10)
const urls = pages
  .filter((m) => !m.noindex)
  .map((m) => {
    const loc = m.path === '/' ? 'https://www.hodex.es/' : `https://www.hodex.es${m.path}`
    const priority = m.path === '/' ? '1.0' : m.path.startsWith('/legal') ? '0.2' : '0.8'
    return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <priority>${priority}</priority>\n  </url>`
  })
await writeFile(
  path.join(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`,
)
console.log(`  ✓ sitemap.xml (${urls.length} páginas)`)

await writeFile(path.join(dist, 'llms.txt'), llmsTxt())
console.log('  ✓ llms.txt')

// El bundle de servidor solo hacía falta para generar los HTML.
await rm(path.join(root, 'dist-server'), { recursive: true, force: true })
