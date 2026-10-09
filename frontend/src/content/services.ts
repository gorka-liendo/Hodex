/**
 * Servicios de Hodex. Cada uno tiene su propia página (/servicios/<slug>),
 * pensada para que Google la entienda sola: título, descripción, qué incluye,
 * para quién es y sus preguntas frecuentes.
 */

export type Service = {
  slug: string
  index: string
  /** Nombre corto (menú, tarjetas, migas de pan). */
  name: string
  /** Título visible de la página (h1). */
  title: string
  /** <title> y descripción para buscadores. */
  seoTitle: string
  seoDescription: string
  /** Resumen para tarjetas. */
  summary: string
  lead: { strong: string; rest: string }
  includes: Array<{ title: string; desc: string }>
  forWho: string[]
  faqs: Array<{ q: string; a: string }>
  /** Slugs de proyectos relacionados. */
  projects: string[]
}

export const SERVICES: Service[] = [
  {
    slug: 'diseno-web',
    index: '01',
    name: 'Diseño web',
    title: 'Diseño y desarrollo web a medida',
    seoTitle: 'Diseño web a medida en Cantabria — Hodex',
    seoDescription:
      'Diseñamos y programamos webs a medida, sin plantillas: rápidas, claras y preparadas para Google. Estudio en Castro Urdiales (Cantabria), trabajamos en toda España.',
    summary:
      'Webs corporativas, landings y tiendas online diseñadas desde cero, rápidas y preparadas para aparecer en Google.',
    lead: {
      strong: 'Una web que transmite confianza y carga al instante.',
      rest: 'Diseñamos y programamos tu web desde cero, sin plantillas: una página corporativa, una landing para un lanzamiento o una tienda online, con una estructura pensada para que Google la entienda desde el primer día.',
    },
    includes: [
      {
        title: 'Diseño a medida',
        desc: 'Una identidad visual propia, coherente con tu marca. Nada de plantillas que se parecen a las de la competencia.',
      },
      {
        title: 'Desarrollo rápido y ligero',
        desc: 'Código moderno, pensado primero para el móvil y optimizado para que la web cargue en un instante.',
      },
      {
        title: 'SEO técnico desde el inicio',
        desc: 'Páginas que Google puede leer, datos estructurados, sitemap, velocidad y alta en Search Console.',
      },
      {
        title: 'Formularios, analítica y mantenimiento',
        desc: 'Contacto que llega a tu correo, estadísticas de visitas respetuosas con la privacidad y soporte después del lanzamiento.',
      },
    ],
    forWho: [
      'Empresas y profesionales cuya web actual no transmite lo que son.',
      'Negocios que lanzan un producto o servicio y necesitan una landing que convierta.',
      'Webs antiguas, lentas o difíciles de mantener que piden un rediseño.',
    ],
    faqs: [
      {
        q: '¿Cuánto cuesta una web a medida?',
        a: 'Depende del número de páginas y de lo que tenga que hacer la web. Tras una primera llamada gratuita te damos un presupuesto cerrado, sin costes ocultos durante el proyecto.',
      },
      {
        q: '¿Cuánto se tarda en tenerla publicada?',
        a: 'Una web corporativa suele estar lista en unas semanas; una tienda online o una web con funciones propias, algo más. Trabajamos por fases para que veas avances desde el principio.',
      },
      {
        q: '¿La web aparecerá en Google?',
        a: 'La construimos para que Google la pueda leer y entender desde el primer día: estructura de páginas, velocidad, datos estructurados y alta en Search Console. El posicionamiento crece con el tiempo y con el contenido.',
      },
      {
        q: '¿Podré cambiar los textos yo mismo?',
        a: 'Sí, si lo necesitas. Podemos añadir un panel para editar los contenidos que cambian a menudo, o encargarnos nosotros de las actualizaciones.',
      },
    ],
    projects: ['golink', 'mytrainerhub'],
  },
  {
    slug: 'automatizacion-ia',
    index: '02',
    name: 'Automatización con IA',
    title: 'Automatización de procesos con inteligencia artificial',
    seoTitle: 'Automatización de procesos con IA para empresas — Hodex',
    seoDescription:
      'Automatizamos tareas repetitivas con inteligencia artificial: lectura de documentos y facturas, atención al cliente, informes e integración con tu CRM. Presupuesto cerrado.',
    summary:
      'Inteligencia artificial trabajando en las tareas repetitivas: documentos, atención al cliente, informes y CRM.',
    lead: {
      strong: 'Menos trabajo manual, menos errores.',
      rest: 'Conectamos tus herramientas y ponemos la inteligencia artificial a trabajar en las tareas repetitivas de tu día a día, para que tu equipo dedique el tiempo a lo que de verdad aporta.',
    },
    includes: [
      {
        title: 'Lectura de documentos',
        desc: 'Facturas, tickets, albaranes o contratos que se leen solos: la IA extrae los datos y tú solo los revisas.',
      },
      {
        title: 'Asistentes y agentes a medida',
        desc: 'Asistentes que responden con la información de tu negocio, clasifican peticiones y preparan borradores.',
      },
      {
        title: 'Integraciones con tus herramientas',
        desc: 'CRM, correo, hojas de cálculo, facturación o pagos conectados entre sí, sin copiar y pegar datos.',
      },
      {
        title: 'Informes y avisos automáticos',
        desc: 'Resúmenes periódicos y alertas cuando algo necesita tu atención, sin tener que ir a buscarlo.',
      },
    ],
    forWho: [
      'Equipos que pierden horas cada semana en tareas repetitivas.',
      'Empresas con mucho volumen de documentos, correos o peticiones.',
      'Negocios que quieren aprovechar la IA con criterio, empezando por lo que más retorno da.',
    ],
    faqs: [
      {
        q: '¿Qué tipo de procesos se pueden automatizar con IA?',
        a: 'Cualquier tarea repetitiva y de alto volumen: atención al cliente, clasificación y gestión documental, generación de informes, entrada de datos en el CRM, seguimiento de leads o facturación. En la primera llamada identificamos cuáles tienen más retorno en tu caso.',
      },
      {
        q: '¿Cuánto cuesta un proyecto de automatización?',
        a: 'Depende del alcance. La primera llamada es gratuita y sin compromiso: mapeamos el proceso y te damos un presupuesto cerrado antes de empezar.',
      },
      {
        q: '¿Cuánto tarda en estar funcionando?',
        a: 'Una automatización acotada suele estar en producción en pocas semanas. Empezamos por el proceso con más impacto para que veas resultados cuanto antes.',
      },
      {
        q: '¿Mis datos están seguros?',
        a: 'Trabajamos con proveedores de IA que no usan tus datos para entrenar sus modelos, ciframos lo sensible y dejamos registro de cada acción. Diseñamos cada automatización para que una persona revise lo importante.',
      },
    ],
    projects: ['golink', 'mytrainerhub'],
  },
  {
    slug: 'aplicaciones-a-medida',
    index: '03',
    name: 'Aplicaciones a medida',
    title: 'Aplicaciones y plataformas web a medida',
    seoTitle: 'Desarrollo de aplicaciones web a medida — Hodex',
    seoDescription:
      'Desarrollamos aplicaciones web a medida: paneles de gestión, plataformas SaaS, áreas de cliente y herramientas internas, con pagos, seguridad y rendimiento de producto serio.',
    summary:
      'Paneles de gestión, plataformas SaaS, áreas de cliente y herramientas internas hechas para tu forma de trabajar.',
    lead: {
      strong: 'Software hecho para tu forma de trabajar.',
      rest: 'Cuando las hojas de cálculo y las herramientas genéricas se quedan cortas, construimos la aplicación que necesitas: desde un panel interno hasta una plataforma que usan tus clientes.',
    },
    includes: [
      {
        title: 'Paneles y herramientas internas',
        desc: 'Gestión de clientes, pedidos, facturas o equipos en una sola pantalla, con los datos que de verdad usas.',
      },
      {
        title: 'Plataformas SaaS y marketplaces',
        desc: 'Productos con cuentas de usuario, suscripciones y portales para tus clientes, listos para crecer.',
      },
      {
        title: 'Pagos y facturación',
        desc: 'Cobros, suscripciones y repartos automáticos con Stripe, y facturas generadas por el propio sistema.',
      },
      {
        title: 'Seguridad de verdad',
        desc: 'Acceso con doble factor, permisos, cifrado de datos sensibles y registro de actividad desde el primer día.',
      },
    ],
    forWho: [
      'Empresas que gestionan su negocio con hojas de cálculo que ya no dan más de sí.',
      'Emprendedores con una idea de producto digital que quieren lanzar bien construida.',
      'Equipos que necesitan una herramienta interna que encaje con su proceso, no al revés.',
    ],
    faqs: [
      {
        q: '¿Qué diferencia hay entre una web y una aplicación web?',
        a: 'Una web presenta tu negocio; una aplicación web lo hace funcionar: usuarios que inician sesión, datos que se guardan, pagos, paneles. Muchas veces un proyecto tiene las dos partes.',
      },
      {
        q: '¿Cuánto tiempo lleva desarrollar una aplicación?',
        a: 'Entre uno y tres meses para una primera versión completa, según el alcance. Trabajamos por fases: tendrás algo funcionando que probar desde las primeras semanas.',
      },
      {
        q: '¿Qué pasa después de la entrega?',
        a: 'El proyecto no termina en la entrega: ofrecemos mantenimiento, mejoras y escalado continuo. El mismo equipo que lo construyó es el que lo mantiene.',
      },
      {
        q: '¿La aplicación será mía?',
        a: 'Sí. El código y los datos son tuyos, y te dejamos todo documentado y desplegado en servicios a tu nombre.',
      },
    ],
    projects: ['mytrainerhub', 'golink'],
  },
]

export const findService = (slug: string) => SERVICES.find((s) => s.slug === slug)
