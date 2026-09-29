import { createBrowserRouter } from 'react-router-dom'
import { PublicOnly, RequireAuth } from './auth/guards'
import { AppShell } from './layout/AppShell'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { ModulePlaceholderPage } from './pages/ModulePlaceholderPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { SecurityPage } from './pages/SecurityPage'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <PublicOnly>
        <LoginPage />
      </PublicOnly>
    ),
  },
  {
    path: '/',
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      {
        path: 'clientes',
        element: (
          <ModulePlaceholderPage
            title="Clientes"
            phase="01"
            description="Tu cartera de clientes y proveedores en un solo sitio."
            includes={[
              'Ficha de cliente y proveedor con NIF/CIF validado',
              'Historial de facturas y cobros por cliente',
              'Notas y datos de contacto',
            ]}
          />
        ),
      },
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
