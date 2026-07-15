import Header from './components/Header'

function App() {
  return (
    <div id="top">
      <Header />

      {/* HERO — placeholder on-brand para ver flotar el header */}
      <section className="flex min-h-screen flex-col justify-end bg-hodex-black pb-12 pt-40 text-hodex-white">
        <div className="mx-auto w-full max-w-6xl px-6">
          <div className="flex items-center gap-4 text-eyebrow uppercase tracking-eyebrow text-hodex-white/55">
            Full-cycle digital product creation
            <span className="h-px max-w-[220px] flex-1 bg-hodex-line-dark" />
          </div>
          <h1 className="mt-6 whitespace-nowrap font-display text-wordmark font-extralight tracking-wordmark">
            HODEX
          </h1>
          <p className="mt-8 max-w-[640px] text-body-lg leading-body">
            <b className="font-semibold text-hodex-white">
              Diseño y producto digital de gama alta.
            </b>{' '}
            <span className="text-hodex-white/55">
              Construimos experiencias precisas, minimalistas y duraderas para marcas
              que exigen estatus sin ruido.
            </span>
          </p>
        </div>
      </section>

      {/* Secciones placeholder solo para dar altura y demostrar el scroll */}
      <section id="work" className="border-b border-hodex-line py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex items-center gap-4 text-eyebrow uppercase tracking-eyebrow text-hodex-gray">
            Selected work
            <span className="h-px max-w-[220px] flex-1 bg-hodex-line" />
          </div>
          <h2 className="mt-6 font-display text-h2 font-light leading-tight">
            Proyectos
          </h2>
          <p className="mt-4 max-w-[600px] text-hodex-gray">
            Sección placeholder — aquí irá la rejilla de proyectos.
          </p>
        </div>
      </section>

      <section id="partners" className="border-b border-hodex-line py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex items-center gap-4 text-eyebrow uppercase tracking-eyebrow text-hodex-gray">
            Trusted by
            <span className="h-px max-w-[220px] flex-1 bg-hodex-line" />
          </div>
          <h2 className="mt-6 font-display text-h2 font-light leading-tight">
            Partners
          </h2>
        </div>
      </section>

      <section id="clients" className="border-b border-hodex-line bg-hodex-off-white py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex items-center gap-4 text-eyebrow uppercase tracking-eyebrow text-hodex-gray">
            Feedback
            <span className="h-px max-w-[220px] flex-1 bg-hodex-line" />
          </div>
          <h2 className="mt-6 font-display text-h2 font-light leading-tight">
            Clientes
          </h2>
        </div>
      </section>

      <section id="contact" className="bg-hodex-black py-24 text-hodex-white">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex items-center gap-4 text-eyebrow uppercase tracking-eyebrow text-hodex-white/55">
            Get in touch
            <span className="h-px max-w-[220px] flex-1 bg-hodex-line-dark" />
          </div>
          <h2 className="mt-6 font-display text-h2 font-light leading-tight">
            Contacto
          </h2>
        </div>
      </section>
    </div>
  )
}

export default App
