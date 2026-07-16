import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import './index.css'
import App from './App.tsx'
import AvisoLegal from './pages/AvisoLegal.tsx'
import Privacidad from './pages/Privacidad.tsx'
import NotFound from './pages/NotFound.tsx'

/**
 * ScrollToHash — con router, al navegar a "/#seccion" desde otra página el
 * ancla aún no existe cuando el navegador intenta el scroll. Reintenta tras
 * el render (doble rAF) para aterrizar en la sección correcta.
 */
function ScrollToHash() {
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ScrollToHash />
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/legal/aviso-legal" element={<AvisoLegal />} />
        <Route path="/legal/privacidad" element={<Privacidad />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      {/* Vercel Web Analytics — requiere Analytics habilitado en el dashboard */}
      <Analytics />
    </BrowserRouter>
  </StrictMode>,
)
