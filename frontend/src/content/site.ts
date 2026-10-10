/** Datos del negocio: una sola fuente para la web, los metadatos y Google. */
export const SITE = {
  name: 'Hodex',
  url: 'https://www.hodex.es',
  email: 'team@hodex.es',
  locality: 'Castro Urdiales',
  region: 'Cantabria',
  country: 'ES',
  /** Zonas a las que damos servicio (para Google y para el pie). */
  areaServed: ['Cantabria', 'Bizkaia', 'España'],
  defaultTitle: 'Hodex — Diseño web, aplicaciones a medida e IA',
  defaultDescription:
    'Estudio de diseño y desarrollo web en Castro Urdiales (Cantabria). Creamos webs a medida, aplicaciones y plataformas web, y automatizamos procesos con inteligencia artificial.',
  ogImage: 'https://www.hodex.es/og-image.png',
  /** Perfiles oficiales (Google los relaciona con la web). */
  sameAs: ['https://www.instagram.com/hodexai'],
  instagram: 'https://www.instagram.com/hodexai',
  logo: 'https://www.hodex.es/hodex-logo.png',
} as const

/** URL absoluta de una ruta del sitio. */
export const absoluteUrl = (path: string) => (path === '/' ? `${SITE.url}/` : `${SITE.url}${path}`)
