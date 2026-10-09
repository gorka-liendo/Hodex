import golinkImg from '../assets/golink.jpg'
import mytrainerhubImg from '../assets/mytrainerhub.jpg'

/**
 * Proyectos de Hodex. Cada uno tiene su caso en /proyectos/<slug>. Textos
 * basados en lo que hace cada producto hoy: sin cifras ni clientes inventados.
 */

export type Project = {
  slug: string
  index: string
  name: string
  domain: string
  href: string
  discipline: string
  tagline: string
  description: string
  tags: string[]
  status: string
  image: string
  seoDescription: string
  challenge: string
  built: Array<{ title: string; desc: string }>
  stack: string[]
  /** Servicios de Hodex que intervienen (slugs). */
  services: string[]
}

export const PROJECTS: Project[] = [
  {
    slug: 'golink',
    index: '01',
    name: 'GoLink',
    domain: 'golink.es',
    href: 'https://golink.es',
    discipline: 'IA · Creator economy',
    tagline: 'Tu bio, ahora factura.',
    description:
      'Una página con su marca para el enlace de la bio: los creadores venden guías y planes hechos con IA y con su método, y cobran cada venta automáticamente.',
    tags: ['IA', 'Link in bio', 'Creators'],
    status: '2026 — En desarrollo',
    image: golinkImg,
    seoDescription:
      'Caso de GoLink: plataforma para que los creadores de contenido vendan guías y planes desde el enlace de su bio, con IA que sigue su método y cobros automáticos con Stripe.',
    challenge:
      'Los creadores de contenido tienen audiencia y un método propio, pero vender lo que saben implica montar una tienda, generar cada plan a mano y perseguir pagos. GoLink lo reduce a una página con su marca en el enlace de la bio.',
    built: [
      {
        title: 'Una tienda en el enlace de la bio',
        desc: 'Cada creador tiene su página personalizada por nicho —estilo, color de marca, modo claro u oscuro— lista para Instagram, TikTok o YouTube.',
      },
      {
        title: 'Planes generados con IA y con su método',
        desc: 'La inteligencia artificial genera cada plan siguiendo la forma de trabajar del creador, no plantillas genéricas.',
      },
      {
        title: 'Cobros y reparto automáticos',
        desc: 'Cada venta se reparte al instante con Stripe: la parte del creador va directa a su cuenta, sin facturas ni persecuciones.',
      },
      {
        title: 'Entrega y analítica en tiempo real',
        desc: 'El comprador recibe su PDF al momento y el creador ve visitas, ventas y enlaces de afiliado desde su panel.',
      },
    ],
    stack: ['React', 'Claude (Anthropic)', 'Stripe'],
    services: ['aplicaciones-a-medida', 'automatizacion-ia', 'diseno-web'],
  },
  {
    slug: 'mytrainerhub',
    index: '02',
    name: 'MyTrainerHub',
    domain: 'mytrainerhub.es',
    href: 'https://mytrainerhub.es',
    discipline: 'IA · Fitness',
    tagline: 'Menos Excel. Más resultados.',
    description:
      'Software para entrenadores personales: sustituye el caos de las hojas de cálculo por planes, seguimiento de clientes y automatización con IA, sin perder el trato humano.',
    tags: ['IA', 'Fitness', 'SaaS'],
    status: '2026 — En desarrollo',
    image: mytrainerhubImg,
    seoDescription:
      'Caso de MyTrainerHub: software SaaS para entrenadores personales con gestión de clientes, dietas y entrenos, seguimiento corporal, portal del cliente e IA.',
    challenge:
      'Los entrenadores personales gestionan a sus clientes con hojas de cálculo, PDFs y mensajes sueltos. MyTrainerHub reúne todo el negocio en un solo panel y da a cada cliente un acceso sencillo a su plan.',
    built: [
      {
        title: 'Gestión de clientes en un solo panel',
        desc: 'Fichas completas, estados y acceso rápido a cada atleta, en lugar de una hoja de cálculo por cliente.',
      },
      {
        title: 'Dietas y entrenos personalizados',
        desc: 'Planes nutricionales por fases y programas por días y sesiones, con biblioteca de alimentos y exportación a PDF.',
      },
      {
        title: 'Portal del cliente sin contraseñas',
        desc: 'Cada cliente recibe un enlace único y privado para ver su dieta, su ficha y su evolución desde cualquier dispositivo.',
      },
      {
        title: 'Seguimiento e IA',
        desc: 'Peso, grasa corporal, medidas, fotos y check-ins en un calendario, con generación asistida por IA y planes de suscripción.',
      },
    ],
    stack: ['React', 'IA generativa', 'Suscripciones'],
    services: ['aplicaciones-a-medida', 'automatizacion-ia'],
  },
]

export const findProject = (slug: string) => PROJECTS.find((p) => p.slug === slug)
