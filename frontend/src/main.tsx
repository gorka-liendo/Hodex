import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import './index.css'
import App from './App.tsx'
import ScrollToHash from './components/ScrollToHash.tsx'
import AvisoLegal from './pages/AvisoLegal.tsx'
import Privacidad from './pages/Privacidad.tsx'
import NotFound from './pages/NotFound.tsx'

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
