import { HOME_FAQS } from '../content/faqs'
import { PROJECTS, type Project } from '../content/projects'
import { SERVICES, type Service } from '../content/services'
import { absoluteUrl, SITE } from '../content/site'

/**
 * Metadatos de cada página: título, descripción, URL canónica y datos
 * estructurados (JSON-LD) para Google. Los usa el prerender para escribir el
 * <head> de cada HTML, y el navegador para actualizarlo al navegar.
 */

export type PageMeta = {
  path: string
  title: string
  description: string
  jsonLd: object[]
  /** Fuera del sitemap y de los buscadores (p. ej. la 404). */
  noindex?: boolean
  /** Etiquetas extra del <head> solo para esta página (p. ej. precargar el hero). */
  extraHead?: string[]
}

const BUSINESS_ID = `${SITE.url}/#negocio`
const WEBSITE_ID = `${SITE.url}/#web`

/** El negocio: aparece en Google como estudio local con sus servicios. */
const business = {
  '@type': 'ProfessionalService',
  '@id': BUSINESS_ID,
  name: SITE.name,
  url: absoluteUrl('/'),
  logo: SITE.logo,
  image: SITE.ogImage,
  email: SITE.email,
  description: SITE.defaultDescription,
  address: {
    '@type': 'PostalAddress',
    addressLocality: SITE.locality,
    addressRegion: SITE.region,
    addressCountry: SITE.country,
  },
  areaServed: SITE.areaServed.map((name) => ({ '@type': name === 'España' ? 'Country' : 'AdministrativeArea', name })),
  knowsAbout: ['Diseño web', 'Desarrollo web a medida', 'Aplicaciones web', 'Inteligencia artificial', 'Automatización de procesos'],
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    name: 'Servicios',
    itemListElement: SERVICES.map((s) => ({
      '@type': 'Offer',
      itemOffered: { '@type': 'Service', name: s.title, url: absoluteUrl(`/servicios/${s.slug}`) },
    })),
  },
}

/** Nombre del sitio en los resultados de Google. */
const website = {
  '@type': 'WebSite',
  '@id': WEBSITE_ID,
  name: SITE.name,
  url: absoluteUrl('/'),
  inLanguage: 'es-ES',
  publisher: { '@id': BUSINESS_ID },
}

const graph = (...nodes: object[]) => ({ '@context': 'https://schema.org', '@graph': nodes })

const faqPage = (faqs: ReadonlyArray<{ q: string; a: string }>) => ({
  '@type': 'FAQPage',
  mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
})

const breadcrumbs = (items: Array<{ name: string; path: string }>) => ({
  '@type': 'BreadcrumbList',
  itemListElement: items.map((item, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: item.name,
    item: absoluteUrl(item.path),
  })),
})

export const homeMeta: PageMeta = {
  path: '/',
  title: SITE.defaultTitle,
  description: SITE.defaultDescription,
  jsonLd: [graph(business, website, faqPage(HOME_FAQS))],
  // El póster del vídeo es lo primero grande que se pinta (LCP): que llegue cuanto antes.
  extraHead: ['<link rel="preload" as="image" href="/hero-poster-720.jpg" fetchpriority="high" />'],
}

export const servicesMeta: PageMeta = {
  path: '/servicios',
  title: 'Servicios de diseño web, aplicaciones e IA — Hodex',
  description:
    'Diseño y desarrollo web a medida, aplicaciones y plataformas web, y automatización de procesos con inteligencia artificial. Estudio en Castro Urdiales (Cantabria).',
  jsonLd: [graph(business, breadcrumbs([{ name: 'Inicio', path: '/' }, { name: 'Servicios', path: '/servicios' }]))],
}

export const serviceMeta = (s: Service): PageMeta => ({
  path: `/servicios/${s.slug}`,
  title: s.seoTitle,
  description: s.seoDescription,
  jsonLd: [
    graph(
      {
        '@type': 'Service',
        name: s.title,
        serviceType: s.name,
        description: s.seoDescription,
        url: absoluteUrl(`/servicios/${s.slug}`),
        provider: { '@id': BUSINESS_ID },
        areaServed: SITE.areaServed,
      },
      business,
      breadcrumbs([
        { name: 'Inicio', path: '/' },
        { name: 'Servicios', path: '/servicios' },
        { name: s.name, path: `/servicios/${s.slug}` },
      ]),
      faqPage(s.faqs),
    ),
  ],
})

export const projectMeta = (p: Project): PageMeta => ({
  path: `/proyectos/${p.slug}`,
  title: `${p.name}: ${p.tagline.replace(/\.$/, '')} — Proyecto de Hodex`,
  description: p.seoDescription,
  jsonLd: [
    graph(
      {
        '@type': 'CreativeWork',
        name: p.name,
        headline: `${p.name} — ${p.tagline}`,
        description: p.seoDescription,
        url: absoluteUrl(`/proyectos/${p.slug}`),
        creator: { '@id': BUSINESS_ID },
        about: p.href,
      },
      business,
      breadcrumbs([
        { name: 'Inicio', path: '/' },
        { name: p.name, path: `/proyectos/${p.slug}` },
      ]),
    ),
  ],
})

export const contactMeta: PageMeta = {
  path: '/contacto',
  title: 'Contacto — Hodex · Diseño web e IA en Cantabria',
  description:
    'Cuéntanos tu proyecto: web, aplicación o automatización con IA. Primera llamada gratuita y presupuesto cerrado. Estudio en Castro Urdiales (Cantabria).',
  jsonLd: [graph(business, breadcrumbs([{ name: 'Inicio', path: '/' }, { name: 'Contacto', path: '/contacto' }]))],
}

export const legalMeta = (path: string, title: string): PageMeta => ({
  path,
  title: `${title} — Hodex`,
  description: `${title} de ${SITE.name}.`,
  jsonLd: [],
})

export const notFoundMeta: PageMeta = {
  path: '/404',
  title: 'Página no encontrada — Hodex',
  description: 'La página que buscas no existe o ha cambiado de dirección.',
  jsonLd: [],
  noindex: true,
}

/** Todas las páginas que se generan como HTML (y van al sitemap salvo noindex). */
export const ALL_PAGES: PageMeta[] = [
  homeMeta,
  servicesMeta,
  ...SERVICES.map(serviceMeta),
  ...PROJECTS.map(projectMeta),
  contactMeta,
  legalMeta('/legal/aviso-legal', 'Aviso legal'),
  legalMeta('/legal/privacidad', 'Política de privacidad'),
]

export const metaForPath = (path: string): PageMeta =>
  ALL_PAGES.find((m) => m.path === path) ?? notFoundMeta

const escapeAttr = (v: string) => v.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

/** Etiquetas del <head> como texto (las escribe el prerender en cada HTML). */
export function headTags(meta: PageMeta): string {
  const url = absoluteUrl(meta.path)
  const tags = [
    `<title>${escapeAttr(meta.title)}</title>`,
    `<meta name="description" content="${escapeAttr(meta.description)}" />`,
    meta.noindex ? `<meta name="robots" content="noindex" />` : `<link rel="canonical" href="${url}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:title" content="${escapeAttr(meta.title)}" />`,
    `<meta property="og:description" content="${escapeAttr(meta.description)}" />`,
    `<meta name="twitter:title" content="${escapeAttr(meta.title)}" />`,
    `<meta name="twitter:description" content="${escapeAttr(meta.description)}" />`,
    // `<` escapado: un texto con "</script>" no puede cerrar el bloque.
    ...(meta.extraHead ?? []),
    ...meta.jsonLd.map((data) => `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`),
  ]
  return tags.join('\n    ')
}
