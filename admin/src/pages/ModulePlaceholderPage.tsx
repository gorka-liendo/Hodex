import { IndexBox } from '../components/brand'
import { PageHeader } from '../components/PageHeader'

/** Pantalla de un módulo aún no construido: deja clara la estructura sin simular datos. */
export function ModulePlaceholderPage({
  title,
  description,
  phase,
  includes,
}: {
  title: string
  description: string
  phase: string
  includes: string[]
}) {
  return (
    <div className="flex flex-col gap-12">
      <PageHeader eyebrow="Gestión" title={title} description={description} />

      <section className="flex flex-col gap-8 border border-hodex-line bg-hodex-white p-8 md:p-12">
        <div className="flex items-center gap-4">
          <IndexBox>{phase}/</IndexBox>
          <span className="text-eyebrow uppercase tracking-eyebrow text-hodex-gray">
            En construcción
          </span>
        </div>
        <p className="max-w-[640px] text-body-lg leading-body">
          <b className="font-semibold text-hodex-black">Este módulo llega en la fase {phase}.</b>{' '}
          <span className="text-hodex-gray">Incluirá:</span>
        </p>
        <ul className="flex flex-col border-t border-hodex-line">
          {includes.map((item) => (
            <li key={item} className="flex gap-4 border-b border-hodex-line py-4 text-hodex-gray">
              <span aria-hidden="true" className="text-hodex-black">
                ↳
              </span>
              {item}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
