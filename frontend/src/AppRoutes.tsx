import { Route, Routes } from 'react-router-dom'
import App from './App'
import ScrollToHash from './components/ScrollToHash'
import Seo from './seo/Seo'
import AvisoLegal from './pages/AvisoLegal'
import ContactPage from './pages/ContactPage'
import NotFound from './pages/NotFound'
import Privacidad from './pages/Privacidad'
import ProjectPage from './pages/ProjectPage'
import ServicePage from './pages/ServicePage'
import ServicesPage from './pages/ServicesPage'

/** Rutas del sitio. Las comparten el navegador y el prerender. */
export default function AppRoutes() {
  return (
    <>
      <ScrollToHash />
      <Seo />
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/servicios" element={<ServicesPage />} />
        <Route path="/servicios/:slug" element={<ServicePage />} />
        <Route path="/proyectos/:slug" element={<ProjectPage />} />
        <Route path="/contacto" element={<ContactPage />} />
        <Route path="/legal/aviso-legal" element={<AvisoLegal />} />
        <Route path="/legal/privacidad" element={<Privacidad />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  )
}
