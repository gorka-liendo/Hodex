import { createBrowserRouter } from 'react-router-dom'
import { PublicOnly, RequireAuth } from './auth/guards'
import { AppShell } from './layout/AppShell'
import { ContactDetailPage } from './pages/contacts/ContactDetailPage'
import { ContactFormPage } from './pages/contacts/ContactFormPage'
import { ContactsPage } from './pages/contacts/ContactsPage'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { ModulePlaceholderPage } from './pages/ModulePlaceholderPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { RouteErrorPage } from './pages/RouteErrorPage'
import { SecurityPage } from './pages/SecurityPage'

export const router = createBrowserRouter([
  {
    path: '/login',
    errorElement: <RouteErrorPage />,
    element: (
      <PublicOnly>
        <LoginPage />
      </PublicOnly>
    ),
  },
  {
    path: '/',
    errorElement: <RouteErrorPage />,
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'clientes', element: <ContactsPage /> },
      { path: 'clientes/nuevo', element: <ContactFormPage /> },
      { path: 'clientes/:id', element: <ContactDetailPage /> },
      { path: 'clientes/:id/editar', element: <ContactFormPage /> },
      {
        path: 'facturas',
        element: (
          <ModulePlaceholderPage
            title="Facturas"
            phase="02"
            description="Emisión y seguimiento de tus facturas."
            includes={[
              'Numeración correlativa y modelo preparado para Verifactu',
              'PDF con la imagen de Hodex',
              'Envío por email y WhatsApp',
              'Control de cobros y vencimientos',
            ]}
          />
        ),
      },
      {
        path: 'gastos',
        element: (
          <ModulePlaceholderPage
            title="Gastos"
            phase="01"
            description="Facturas recibidas y gastos de la empresa."
            includes={[
              'Registro manual de gastos con su factura adjunta',
              'Categorías y base, IVA y retención',
              'Más adelante: lectura automática con IA',
            ]}
          />
        ),
      },
      { path: 'ajustes/seguridad', element: <SecurityPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
