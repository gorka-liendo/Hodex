import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { absoluteUrl } from '../content/site'
import { metaForPath } from './meta'

function setMeta(selector: string, attr: 'content' | 'href', value: string) {
  document.head.querySelector(selector)?.setAttribute(attr, value)
}

/**
 * Mantiene el <head> al día al navegar dentro de la web (título, descripción,
 * canonical y Open Graph). La primera carga ya llega con todo escrito por el
 * prerender; esto cubre la navegación sin recargar.
 */
export default function Seo() {
  const { pathname } = useLocation()

  useEffect(() => {
    const path = pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname
    const meta = metaForPath(path)
    document.title = meta.title
    setMeta('meta[name="description"]', 'content', meta.description)
    setMeta('link[rel="canonical"]', 'href', absoluteUrl(meta.path))
    setMeta('meta[property="og:url"]', 'content', absoluteUrl(meta.path))
    setMeta('meta[property="og:title"]', 'content', meta.title)
    setMeta('meta[property="og:description"]', 'content', meta.description)
  }, [pathname])

  return null
}
