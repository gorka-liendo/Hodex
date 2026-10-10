import PageLayout, { ClosingCta, PageHero } from '../components/PageLayout'
import Process from '../components/Process'
import Services from '../components/Services'

/** /servicios — índice de servicios. */
export default function ServicesPage() {
  return (
    <PageLayout>
      <PageHero
        crumbs={[
          { name: 'Inicio', to: '/' },
          { name: 'Servicios', to: '/servicios' },
        ]}
        eyebrow="Servicios"
        title="Diseño web, aplicaciones e inteligencia artificial"
        lead={{
          strong: 'Un mismo equipo para todo.',
          rest: 'Desde Castro Urdiales (Cantabria) diseñamos webs, desarrollamos aplicaciones web y móviles, y ponemos la IA a trabajar en tu negocio, también en WhatsApp. Para empresas de toda España. Elige por dónde empezar o cuéntanos tu caso.',
        }}
        cta={{ label: 'Pide presupuesto', to: '/contacto' }}
      />
      <Services showIntro={false} />
      <Process index="02" />
      <ClosingCta
        title="¿No sabes cuál encaja con tu proyecto?"
        text="Cuéntanos qué quieres conseguir y te proponemos el camino más directo, con un plan por fases y un presupuesto cerrado."
      />
    </PageLayout>
  )
}
