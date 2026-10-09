import { useEffect, useRef, useState, type ReactNode } from 'react'

/**
 * Reveal — envoltorio de scroll-reveal reutilizable. Usa IntersectionObserver
 * (sin dependencias) para hacer aparecer el contenido al entrar en viewport:
 * fade + desplazamiento sutil hacia arriba. Respeta prefers-reduced-motion.
 */
export default function Reveal({
  children,
  delay = 0,
  className = '',
}: {
  children: ReactNode
  delay?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  // Igual en el servidor (prerender) y en el navegador, para que la hidratación
  // cuadre. Quien desactiva las animaciones lo ve todo ya visible por CSS
  // (motion-reduce:…), sin depender de este estado.
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          obs.disconnect()
        }
      },
      // threshold bajo + margen fijo en px: el elemento aparece en cuanto asoma
      // 60px, también en móvil donde los bloques son altos (un threshold
      // porcentual alto los dejaba invisibles hasta muy avanzado el scroll).
      { threshold: 0.05, rootMargin: '0px 0px -60px 0px' },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 ease-out motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:transition-none ${
        inView ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
      } ${className}`}
    >
      {children}
    </div>
  )
}
