# Guía SEO — Hodex

Documento de referencia: qué se ha implementado en hodex.es, por qué, cómo
mantenerlo y qué hacer a continuación. Sirve también como guía reutilizable
para cualquier otro proyecto (GoLink, MyTrainerHub…).

Última revisión: julio 2026.

---

## 1. Principios

El SEO se sostiene sobre tres patas, por orden de importancia:

1. **Contenido** — texto real que responde a lo que la gente busca. Sin esto,
   el resto es decoración. Una landing de 300 palabras posiciona para tu
   marca; para "automatización con IA para empresas" necesitas contenido.
2. **Rendimiento** — Google mide los Core Web Vitals (velocidad de carga,
   estabilidad visual, interactividad) y los usa para posicionar. Un vídeo
   de 34 MB en el hero pesa más que cualquier meta tag.
3. **Técnico** — metas, datos estructurados, sitemap… Es lo más fácil de
   hacer y lo primero que se hace, pero es condición necesaria, no
   suficiente: no te sube, pero su ausencia te hunde.

Regla práctica: **si dudas dónde invertir una hora, inviértela en contenido.**

---

## 2. Checklist técnico (implementado ✅)

Todo esto ya está hecho en el repo. Referencias por archivo para encontrarlo.

### `frontend/index.html`

- ✅ `lang="es"` en `<html>` — declara el idioma a Google.
- ✅ `<title>` descriptivo (~55 caracteres): marca + propuesta de valor.
  No solo "Hodex" — el título es el enlace azul en los resultados.
- ✅ `<meta name="description">` (~155 caracteres) — el texto gris bajo el
  enlace. No posiciona, pero decide si hacen clic.
- ✅ `<link rel="canonical">` → `https://www.hodex.es/` — un solo dominio
  canónico (www). El apex redirige 308 a www; nunca tener las dos versiones
  sirviendo contenido, Google lo trata como duplicado.
- ✅ Open Graph completo (`og:title/description/image/url/locale`) +
  Twitter Card — controlan la tarjeta al compartir el enlace.
- ✅ `og:image` = `/og-image.png`, **1200×630** (el tamaño estándar).
- ✅ JSON-LD `Organization` — le dice a Google quién es la empresa (nombre,
  logo, email, áreas de conocimiento).
- ✅ JSON-LD `FAQPage` — espejo de la sección FAQ. Google puede mostrar las
  preguntas desplegables en el propio resultado de búsqueda (rich results).
  **⚠️ Mantener en sincronía con `src/components/Faq.tsx`** al editar.
- ✅ `preconnect` a Google Fonts — resuelve DNS/TLS antes de pedir la fuente.

### `frontend/public/`

- ✅ `robots.txt` — permite todo y apunta al sitemap.
- ✅ `sitemap.xml` — lista de URLs para Google. **⚠️ Al añadir páginas
  nuevas (blog, casos de estudio) hay que añadirlas aquí.**
- ✅ `og-image.png` — la tarjeta social (wordmark metálico sobre negro).
- ✅ `favicon.svg` — con variante clara/oscura vía `prefers-color-scheme`.

### Semántica (`src/App.tsx` y componentes)

- ✅ Un solo `<h1>` por página (el wordmark HODEX + contexto `sr-only` con
  keywords para buscadores y lectores de pantalla).
- ✅ Jerarquía correcta: `h1` → `h2` por sección → `h3` en items.
- ✅ `<main>`, `<footer>`, `<section>`, `<article>`, `<nav>` semánticos.
- ✅ `alt` descriptivo en imágenes; vídeo decorativo con `aria-hidden`.
- ✅ `loading="lazy"` en imágenes bajo el fold.

### Rendimiento

- ✅ Vídeo hero: 4K/34 MB → 1080p/2,6 MB (`ffmpeg -crf 30`, sin audio,
  `faststart`) + `poster` con el primer frame para pintar al instante.
  **⚠️ Regla: ningún vídeo de fondo debería superar ~4 MB.** Comando usado:
  ```bash
  ffmpeg -i in.mp4 -vf scale=1920:-2 -c:v libx264 -crf 30 -preset slow \
         -an -movflags +faststart out.mp4
  ffmpeg -i in.mp4 -vf "select=eq(n\,0),scale=1920:-2" -frames:v 1 poster.jpg
  ```
- ✅ Media sin uso fuera de `public/` (Vite copia TODO `public/` al build —
  lo que no se usa va a `frontend/media-src/`, ignorado).
- ✅ Animaciones respetan `prefers-reduced-motion` (variante `motion-safe:`).
- ✅ nginx (deploy Docker): gzip + caché inmutable para `/assets/`.

### Medición

- ✅ **Vercel Analytics** (`@vercel/analytics` en `main.tsx` + habilitado en
  el dashboard) — visitas y páginas vistas.
- ✅ **Google Search Console** — propiedad de dominio `hodex.es` verificada
  con TXT en DNS (Infomaniak), sitemap enviado, indexación solicitada.
  Cuenta: la Google account creada sobre `team@hodex.es`.

---

## 3. Rutina de mantenimiento

### Cada semana o dos (5 min)

- **Search Console → Rendimiento**: con qué búsquedas apareces, posición
  media, clics. Buscar sorpresas (búsquedas con impresiones altas y pocos
  clics = oportunidad de mejorar título/descripción).
- **Vercel Analytics**: qué secciones/páginas se visitan.

### Al publicar contenido nuevo

1. Añadir la URL a `frontend/public/sitemap.xml` (con `lastmod` actualizado).
2. Search Console → Inspeccionar URL → **Solicitar indexación**.
3. Si la página tiene FAQ propias, añadir su JSON-LD `FAQPage`.

### Al cambiar textos clave

- Si tocas título/descripción de `index.html`, revisa que sigan midiendo
  ~55/~155 caracteres.
- Si tocas la sección FAQ, actualiza el JSON-LD espejo de `index.html`.
- Si cambias el dominio o añades subdominios: canonical, OG, sitemap,
  robots y `CORS_ORIGIN` del backend.

### Herramientas de comprobación (gratuitas)

| Herramienta | Para qué |
|---|---|
| [PageSpeed Insights](https://pagespeed.web.dev) | Core Web Vitals reales — pasar la home de vez en cuando |
| [Rich Results Test](https://search.google.com/test/rich-results) | Validar los JSON-LD (Organization, FAQPage) |
| [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/) | Ver/refrescar la tarjeta OG en LinkedIn |
| `site:hodex.es` en Google | Ver qué tiene indexado Google de tu dominio |

---

## 4. Roadmap de mejoras (pendiente, por impacto)

### Alto impacto

1. **Casos de estudio** de GoLink y MyTrainerHub como páginas propias
   (`/casos/golink`…): problema → solución → métricas. Es el contenido que
   más posiciona y más convierte para una consultora. Requiere routing
   (react-router) o páginas estáticas.
2. **Blog / artículos** respondiendo búsquedas concretas del cliente
   objetivo: "cómo automatizar la atención al cliente con IA", "cuánto
   cuesta desarrollar una plataforma web a medida"… Un artículo bueno al
   mes ya marca diferencia.
3. **Backlinks**: dar de alta la empresa en directorios (Clutch, GoodFirms,
   directorios locales), perfil de LinkedIn de empresa enlazando a la web,
   y a futuro guest posts / menciones. Los enlaces entrantes siguen siendo
   la señal de autoridad nº 1.

### Impacto medio

4. **Prerender/SSG**: la web es una SPA — Google la renderiza bien pero
   tarda más. Si se añade blog/casos, valorar migrar a generación estática
   (Astro, vite-plugin-ssr o pre-render en build) para servir HTML completo.
5. **Google Business Profile** si hay dirección física o área de servicio —
   habilita el pack local de resultados.
6. **Recuperar Partners y Clients** (ocultos en git, commit `54d55c3`)
   cuando haya logos y testimonios reales — prueba social = mejor CTR y
   conversión.
7. **Página 404 propia** y páginas legales (privacidad, cookies si se añade
   tracking con cookies — Vercel Analytics actual no las usa).

### Detalle fino

8. **Unificar idioma** de los textos con peso semántico (eyebrows/nav en
   inglés es decisión de marca aceptable, pero h2/párrafos siempre en
   español, que es el mercado objetivo).
9. `hreflang` solo si algún día hay versión en otro idioma.
10. Revisar el peso del JS (~220 KB) si crece — code-splitting por sección.

---

## 5. Errores comunes (no cometer)

- ❌ Keyword stuffing: repetir "automatización IA" 40 veces. Google lo
  penaliza desde hace una década. Escribir para personas.
- ❌ Contenido thin: páginas con solo un título ("Partners") indexadas.
  Mejor ocultarlas hasta tener contenido (como se hizo).
- ❌ Dos dominios sirviendo lo mismo sin canonical/redirect (www vs apex).
- ❌ Bloquear el renderizado con media pesada above the fold.
- ❌ Comprar backlinks o granjas de enlaces — penalización directa.
- ❌ Esperar resultados en días. El SEO se mide en meses: 3-6 meses para
  ver tracción real en búsquedas no-marca. Search Console es el termómetro.
