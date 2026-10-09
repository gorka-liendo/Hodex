import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router'
import AppRoutes from './AppRoutes'
import { HOME_FAQS } from './content/faqs'
import { PROJECTS } from './content/projects'
import { SERVICES } from './content/services'
import { absoluteUrl, SITE } from './content/site'
import { ALL_PAGES, headTags, notFoundMeta, type PageMeta } from './seo/meta'

/**
 * Prerender: genera el HTML de cada página en el build, para que Google (y
 * cualquiera sin JavaScript) reciba el contenido completo desde el principio.
 * Lo usa scripts/prerender.mjs.
 */
export function render(meta: PageMeta) {
  const html = renderToString(
    <StrictMode>
      <StaticRouter location={meta.path === notFoundMeta.path ? '/pagina-no-encontrada' : meta.path}>
        <AppRoutes />
      </StaticRouter>
    </StrictMode>,
  )
  return { html, head: headTags(meta) }
}

export const pages: PageMeta[] = [...ALL_PAGES, notFoundMeta]

/**
 * /llms.txt (llmstxt.org): resumen en Markdown para asistentes de IA
 * (ChatGPT, Perplexity, Claude…). Se genera con los mismos datos que la web.
 */
export function llmsTxt(): string {
  const lines = [
    `# ${SITE.name}`,
    '',
    `> ${SITE.defaultDescription}`,
    '',
    `Estudio en ${SITE.locality} (${SITE.region}, España). Trabajamos con empresas de ${SITE.areaServed.slice(0, -1).join(', ')} y toda España. Contacto: ${SITE.email}.`,
    '',
    '## Servicios',
    '',
    ...SERVICES.map((s) => `- [${s.title}](${absoluteUrl(`/servicios/${s.slug}`)}): ${s.summary}`),
    '',
    '## Proyectos',
    '',
    ...PROJECTS.map((p) => `- [${p.name}](${absoluteUrl(`/proyectos/${p.slug}`)}): ${p.tagline} ${p.description}`),
    '',
    '## Preguntas frecuentes',
    '',
    ...HOME_FAQS.map((f) => `- **${f.q}** ${f.a}`),
    '',
    '## Más',
    '',
    `- [Contacto](${absoluteUrl('/contacto')}): primera llamada gratuita y presupuesto cerrado.`,
    `- [Aviso legal](${absoluteUrl('/legal/aviso-legal')})`,
    `- [Política de privacidad](${absoluteUrl('/legal/privacidad')})`,
    '',
  ]
  return lines.join('\n')
}
