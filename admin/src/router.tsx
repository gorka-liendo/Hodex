import { createBrowserRouter } from 'react-router-dom'
import { PublicOnly, RequireAuth } from './auth/guards'
import { AppShell } from './layout/AppShell'
import { ActivityPage } from './pages/ActivityPage'
import { ContactDetailPage } from './pages/contacts/ContactDetailPage'
import { ContactFormPage } from './pages/contacts/ContactFormPage'
import { ContactsPage } from './pages/contacts/ContactsPage'
import { DashboardPage } from './pages/DashboardPage'
import { ExpenseDetailPage } from './pages/expenses/ExpenseDetailPage'
import { ExpenseFormPage } from './pages/expenses/ExpenseFormPage'
import { ExpensesPage } from './pages/expenses/ExpensesPage'
import { LoginPage } from './pages/LoginPage'
import { InvoiceDetailPage } from './pages/invoices/InvoiceDetailPage'
import { InvoiceEditorPage } from './pages/invoices/InvoiceEditorPage'
import { InvoicesPage } from './pages/invoices/InvoicesPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { RouteErrorPage } from './pages/RouteErrorPage'
import { SecurityPage } from './pages/SecurityPage'
import { CompanySettingsPage } from './pages/settings/CompanySettingsPage'
import { TaxesPage } from './pages/TaxesPage'

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
      { path: 'facturas', element: <InvoicesPage /> },
      { path: 'facturas/nueva', element: <InvoiceEditorPage /> },
      { path: 'facturas/:id', element: <InvoiceDetailPage /> },
      { path: 'facturas/:id/editar', element: <InvoiceEditorPage /> },
      { path: 'gastos', element: <ExpensesPage /> },
      { path: 'gastos/nuevo', element: <ExpenseFormPage /> },
      { path: 'gastos/:id', element: <ExpenseDetailPage /> },
      { path: 'gastos/:id/editar', element: <ExpenseFormPage /> },
      { path: 'impuestos', element: <TaxesPage /> },
      { path: 'ajustes/empresa', element: <CompanySettingsPage /> },
      { path: 'ajustes/seguridad', element: <SecurityPage /> },
      { path: 'ajustes/actividad', element: <ActivityPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
