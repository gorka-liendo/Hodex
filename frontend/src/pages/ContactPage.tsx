import Contact from '../components/Contact'
import PageLayout, { PageHero } from '../components/PageLayout'

/** /contacto — formulario de contacto como página propia. */
export default function ContactPage() {
  return (
    <PageLayout>
      <PageHero
        crumbs={[
          { name: 'Inicio', to: '/' },
          { name: 'Contacto', to: '/contacto' },
        ]}
        eyebrow="Contacto"
        title="Hablemos de tu proyecto"
        lead={{
          strong: 'Cuéntanos quién eres y qué necesitas.',
          rest: 'La primera llamada es gratuita y sin compromiso. Te respondemos con una propuesta clara y un presupuesto cerrado. También puedes escribirnos a team@hodex.es.',
        }}
      />
      <div className="border-t border-hodex-line-dark">
        <Contact showIntro={false} />
      </div>
    </PageLayout>
  )
}
