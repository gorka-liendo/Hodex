import Header from './components/Header'
import Work from './components/Work'
import Contact from './components/Contact'

function App() {
  return (
    <div id="top">
      <Header />

      {/* HERO — video de fondo */}
      <section className="relative flex min-h-screen flex-col justify-end overflow-hidden bg-hodex-black pb-20 pt-40 text-hodex-white">
        <video
          autoPlay
          muted
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
        >
          <source src="/video2.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-black/60" />
        <div className="mx-auto w-full max-w-6xl px-6 relative z-10">
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

      {/* WORK — proyectos */}
      <Work />

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

      {/* CONTACT — formulario */}
      <Contact />
    </div>
  )
}

export default App
