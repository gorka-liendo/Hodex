import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router'
import AppRoutes from './AppRoutes'
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
