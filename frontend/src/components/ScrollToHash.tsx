import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * ScrollToHash — con router, al navegar a "/#seccion" desde otra página el
 * ancla aún no existe cuando el navegador intenta el scroll. Reintenta tras
 * el render (doble rAF) para aterrizar en la sección correcta.
 */
export default function ScrollToHash() {
  const { hash, pathname } = useLocation()

  useEffect(() => {
    if (!hash) return
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth' })
      }),
    )
  }, [hash, pathname])

  return null
}
