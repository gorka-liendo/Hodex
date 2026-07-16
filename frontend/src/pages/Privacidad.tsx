import LegalLayout, { LegalSection } from './LegalLayout'

/**
 * Política de Privacidad — información exigida por los arts. 13 RGPD y 11
 * LOPDGDD para los datos recogidos vía formulario de contacto: responsable,
 * finalidad, base legal, destinatarios/encargados, conservación y derechos.
 *
 * ⚠️ PLACEHOLDERS PENDIENTES antes de considerar la página conforme:
 * [RAZÓN SOCIAL], [CIF], [DOMICILIO SOCIAL].
 */
export default function Privacidad() {
  return (
    <LegalLayout
      eyebrow="Legal"
      title="Política de privacidad"
      updated="16 de julio de 2026"
    >
      <LegalSection title="1. Responsable del tratamiento">
        <ul>
          <li>
            <b>Responsable:</b> [RAZÓN SOCIAL]
          </li>
          <li>
            <b>CIF:</b> [CIF]
          </li>
          <li>
            <b>Domicilio:</b> [DOMICILIO SOCIAL]
          </li>
          <li>
            <b>Email:</b> <a href="mailto:team@hodex.es">team@hodex.es</a>
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="2. Qué datos recogemos">
        <p>
          A través del formulario de contacto de este sitio web recogemos los
          siguientes datos: <b>nombre</b>, <b>dirección de email</b>,{' '}
          <b>empresa</b> (opcional), el <b>motivo de contacto</b> seleccionado
          y el <b>contenido del mensaje</b>.
        </p>
        <p>
          No recogemos datos de navegación identificables: la analítica de
          este sitio (Vercel Web Analytics) funciona <b>sin cookies</b> y sin
          identificar a visitantes individuales.
        </p>
      </LegalSection>

      <LegalSection title="3. Finalidad del tratamiento">
        <p>
          Los datos se tratan con una única finalidad: <b>atender y responder
          la consulta</b> enviada a través del formulario de contacto, y
          mantener la comunicación comercial derivada de esa consulta si el
          usuario así lo desea.
        </p>
        <p>
          No utilizamos los datos para enviar comunicaciones comerciales no
          solicitadas ni los incorporamos a listas de correo.
        </p>
      </LegalSection>

      <LegalSection title="4. Base legal">
        <p>
          La base legal del tratamiento es el <b>consentimiento del
          interesado</b> (art. 6.1.a RGPD), otorgado al marcar la casilla de
          aceptación de esta política antes de enviar el formulario, y la{' '}
          <b>aplicación de medidas precontractuales</b> (art. 6.1.b RGPD)
          cuando la consulta se refiere a la contratación de nuestros
          servicios.
        </p>
      </LegalSection>

      <LegalSection title="5. Destinatarios y encargados del tratamiento">
        <p>
          No cedemos datos personales a terceros. Para prestar el servicio
          utilizamos los siguientes proveedores, que actúan como encargados
          del tratamiento con las garantías del art. 28 RGPD:
        </p>
        <ul>
          <li>
            <b>Vercel Inc.</b> (EE. UU.) — alojamiento del sitio web.
          </li>
          <li>
            <b>Railway Corp.</b> (EE. UU.) — infraestructura del servidor que
            procesa el formulario.
          </li>
          <li>
            <b>Resend (Plus Five Five, Inc.)</b> (EE. UU.) — envío del email
            de notificación con el contenido de la consulta.
          </li>
        </ul>
        <p>
          Estos proveedores pueden implicar transferencias internacionales de
          datos a Estados Unidos, amparadas en las Cláusulas Contractuales
          Tipo de la Comisión Europea y/o el EU-U.S. Data Privacy Framework.
        </p>
      </LegalSection>

      <LegalSection title="6. Plazo de conservación">
        <p>
          Los datos se conservan durante el tiempo necesario para atender la
          consulta y, como máximo, <b>durante dos años</b> desde la última
          comunicación, salvo que exista una relación contractual posterior o
          una obligación legal que exija conservarlos más tiempo.
        </p>
      </LegalSection>

      <LegalSection title="7. Derechos">
        <p>
          Puedes ejercer en cualquier momento tus derechos de <b>acceso,
          rectificación, supresión, oposición, limitación del tratamiento y
          portabilidad</b>, así como retirar el consentimiento prestado,
          escribiendo a <a href="mailto:team@hodex.es">team@hodex.es</a> e
          indicando el derecho que deseas ejercer.
        </p>
        <p>
          Si consideras que el tratamiento no se ajusta a la normativa,
          puedes presentar una reclamación ante la Agencia Española de
          Protección de Datos (<a href="https://www.aepd.es" target="_blank" rel="noopener noreferrer">www.aepd.es</a>).
        </p>
      </LegalSection>

      <LegalSection title="8. Cookies">
        <p>
          Este sitio web <b>no utiliza cookies</b> ni tecnologías de
          seguimiento equivalentes. La medición de audiencia se realiza con
          Vercel Web Analytics, un sistema sin cookies que agrega los datos
          de forma anónima, por lo que no se requiere banner de
          consentimiento.
        </p>
      </LegalSection>

      <LegalSection title="9. Seguridad">
        <p>
          Aplicamos medidas técnicas y organizativas apropiadas para
          garantizar la seguridad de los datos: comunicación cifrada (HTTPS)
          en todo el sitio, acceso restringido a los datos y proveedores de
          infraestructura con certificaciones de seguridad reconocidas.
        </p>
      </LegalSection>

      <LegalSection title="10. Cambios en esta política">
        <p>
          Esta política puede actualizarse para reflejar cambios normativos o
          en los servicios. La versión vigente estará siempre publicada en
          esta página, con su fecha de última actualización.
        </p>
      </LegalSection>
    </LegalLayout>
  )
}
