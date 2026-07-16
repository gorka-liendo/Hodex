import LegalLayout, { LegalSection } from './LegalLayout'

/**
 * Aviso Legal — exigido por el art. 10 de la LSSI-CE (Ley 34/2002) para toda
 * web con actividad económica: identificación del titular, condiciones de uso,
 * propiedad intelectual y legislación aplicable.
 *
 * NOTA: cuando Hodex se constituya como sociedad, añadir aquí razón social,
 * CIF y datos registrales (obligatorio por LSSI art. 10).
 */
export default function AvisoLegal() {
  return (
    <LegalLayout eyebrow="Legal" title="Aviso legal" updated="16 de julio de 2026">
      <LegalSection title="1. Identificación del titular">
        <p>
          En cumplimiento del artículo 10 de la Ley 34/2002, de 11 de julio, de
          Servicios de la Sociedad de la Información y de Comercio Electrónico
          (LSSI-CE), se informa de que el titular de este sitio web es:
        </p>
        <ul>
          <li>
            <b>Titular:</b> Hodex
          </li>
          <li>
            <b>Ubicación:</b> Castro Urdiales (Cantabria), España
          </li>
          <li>
            <b>Email de contacto:</b>{' '}
            <a href="mailto:team@hodex.es">team@hodex.es</a>
          </li>
          <li>
            <b>Sitio web:</b> https://www.hodex.es
          </li>
        </ul>
        <p>
          Para cualquier comunicación relativa a este sitio web, el canal de
          contacto es el email indicado.
        </p>
      </LegalSection>

      <LegalSection title="2. Objeto">
        <p>
          El presente aviso legal regula el uso del sitio web www.hodex.es
          (en adelante, «el sitio web»), a través del cual el titular ofrece
          información sobre sus servicios de consultoría tecnológica,
          automatización de procesos con inteligencia artificial y desarrollo
          de productos web a medida.
        </p>
        <p>
          El acceso y la navegación por el sitio web atribuyen la condición de
          usuario e implican la aceptación de las condiciones aquí recogidas.
        </p>
      </LegalSection>

      <LegalSection title="3. Condiciones de uso">
        <p>
          El usuario se compromete a hacer un uso adecuado del sitio web y de
          sus contenidos, de conformidad con la ley y el presente aviso legal.
          Queda prohibido el uso del sitio web con fines ilícitos o lesivos
          para los derechos e intereses del titular o de terceros, así como
          cualquier acción que pueda dañar, inutilizar o sobrecargar el sitio
          web o impedir su normal utilización.
        </p>
      </LegalSection>

      <LegalSection title="4. Propiedad intelectual e industrial">
        <p>
          Todos los contenidos del sitio web — incluyendo, a título
          enunciativo, textos, diseños, marcas, logotipos, código fuente,
          imágenes y vídeos — son titularidad del titular del sitio web o de
          terceros que han autorizado su uso, y están protegidos por la
          normativa de propiedad intelectual e industrial.
        </p>
        <p>
          Queda prohibida su reproducción, distribución, comunicación pública
          o transformación sin la autorización expresa del titular.
        </p>
      </LegalSection>

      <LegalSection title="5. Exclusión de responsabilidad">
        <p>
          El titular no se hace responsable de los daños derivados del uso
          incorrecto del sitio web, de la falta de disponibilidad puntual del
          servicio por causas técnicas ajenas, ni de los contenidos de sitios
          de terceros a los que se pueda acceder mediante enlaces publicados
          en este sitio web.
        </p>
      </LegalSection>

      <LegalSection title="6. Protección de datos">
        <p>
          El tratamiento de los datos personales recogidos a través de este
          sitio web se rige por la{' '}
          <a href="/legal/privacidad">Política de Privacidad</a>.
        </p>
      </LegalSection>

      <LegalSection title="7. Legislación aplicable y jurisdicción">
        <p>
          Las presentes condiciones se rigen por la legislación española.
          Para la resolución de cualquier controversia derivada del uso del
          sitio web, las partes se someten a los juzgados y tribunales del
          domicilio del titular, salvo que la normativa aplicable disponga
          otra cosa.
        </p>
      </LegalSection>
    </LegalLayout>
  )
}
