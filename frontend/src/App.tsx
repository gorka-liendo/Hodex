import Header from './components/Header'
import Reveal from './components/Reveal'
import About from './components/About'
import Work from './components/Work'
import Philosophy from './components/Philosophy'
import Contact from './components/Contact'
import Footer from './components/Footer'

function App() {
  return (
    <div id="top">
      <Header />

      <main>
        {/* HERO — video de fondo */}
        <section className="relative flex min-h-screen flex-col justify-end overflow-hidden bg-hodex-black pb-20 pt-40 text-hodex-white">
          <video
            autoPlay
            muted
            playsInline
            preload="metadata"
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover motion-safe:animate-hero-zoom"
          >
            <source src="/video2.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative z-10 mx-auto w-full max-w-[1320px] px-6">
            {/* Entrada escalonada al cargar: eyebrow → wordmark → párrafo */}
            <Reveal>
              <div className="flex items-center gap-4 text-eyebrow uppercase tracking-eyebrow text-hodex-white/55">
                Full-cycle digital product creation
                <span className="h-px max-w-[220px] flex-1 bg-hodex-line-dark" />
              </div>
            </Reveal>
            <Reveal delay={150}>
              <h1 className="mt-6 whitespace-nowrap font-display text-wordmark font-extralight tracking-wordmark text-metallic">
                HODEX
                {/* Contexto para buscadores y lectores de pantalla — invisible */}
                <span className="sr-only">
                  {' '}
                  — Automatización con IA y productos web a medida
                </span>
              </h1>
            </Reveal>
            <Reveal delay={300}>
              <p className="mt-8 max-w-[640px] text-body-lg leading-body">
                <b className="font-semibold text-hodex-white">
                  Diseño y producto digital de gama alta.
                </b>{' '}
                <span className="text-hodex-white/55">
                  Construimos experiencias precisas, minimalistas y duraderas para
                  marcas que exigen estatus sin ruido.
                </span>
              </p>
            </Reveal>
          </div>
        </section>

        {/* ABOUT — quiénes somos */}
        <About />

        {/* WORK — proyectos */}
        <Work />

        {/* PHILOSOPHY — cita con ghost wordmark */}
        <Philosophy />

        <section id="partners" className="border-b border-hodex-line py-24">
          <div className="mx-auto max-w-[1320px] px-6">
            <Reveal>
              <div className="flex items-center gap-4 text-eyebrow uppercase tracking-eyebrow text-hodex-gray">
                Trusted by
                <span className="h-px max-w-[220px] flex-1 bg-hodex-line" />
              </div>
              <h2 className="mt-6 font-display text-h2 font-light leading-tight">
                Partners
              </h2>
            </Reveal>
          </div>
        </section>

        <section id="clients" className="border-b border-hodex-line bg-hodex-off-white py-24">
          <div className="mx-auto max-w-[1320px] px-6">
            <Reveal>
              <div className="flex items-center gap-4 text-eyebrow uppercase tracking-eyebrow text-hodex-gray">
                Feedback
                <span className="h-px max-w-[220px] flex-1 bg-hodex-line" />
              </div>
              <h2 className="mt-6 font-display text-h2 font-light leading-tight">
                Clientes
              </h2>
            </Reveal>
          </div>
        </section>

        {/* CONTACT — formulario */}
        <Contact />
      </main>

      <Footer />
    </div>
  )
}

export default App
