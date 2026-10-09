import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import './index.css'
import AppRoutes from './AppRoutes'

const app = (
  <StrictMode>
    <BrowserRouter>
      <AppRoutes />
      {/* Vercel Web Analytics — requiere Analytics habilitado en el dashboard */}
      <Analytics />
    </BrowserRouter>
  </StrictMode>
)

// En producción cada página llega ya renderizada (prerender): se hidrata.
// En desarrollo (vite dev) el contenedor viene vacío: se monta desde cero.
const root = document.getElementById('root')!
if (root.firstElementChild) hydrateRoot(root, app)
else createRoot(root).render(app)
