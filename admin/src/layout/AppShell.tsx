import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth, useSession } from '../auth/useAuth'
import { Eyebrow, Isotype } from '../components/brand'
import { Button } from '../components/Button'

interface NavItem {
  to: string
  label: string
  end?: boolean
}

const SECTIONS: Array<{ section: string; items: NavItem[] }> = [
  {
    section: 'Gestión',
    items: [
      { to: '/', label: 'Resumen', end: true },
      { to: '/clientes', label: 'Clientes' },
      { to: '/facturas', label: 'Facturas' },
      { to: '/gastos', label: 'Gastos' },
    ],
  },
  {
    section: 'Cuenta',
    items: [{ to: '/ajustes/seguridad', label: 'Seguridad' }],
  },
]

/** Navegación con numeración correlativa (01, 02…) calculada una sola vez. */
const NAV = SECTIONS.reduce<Array<{ section: string; items: Array<NavItem & { number: string }> }>>(
  (acc, { section, items }) => {
    const offset = acc.reduce((n, s) => n + s.items.length, 0)
    acc.push({
      section,
      items: items.map((item, i) => ({ ...item, number: String(offset + i + 1).padStart(2, '0') })),
    })
    return acc
  },
  [],
)

/**
 * Contenido de la barra lateral (compartido por escritorio y menú móvil).
 * `onNavigate` permite cerrar el menú móvil al elegir una sección.
 */
function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { logout } = useAuth()
  const { user } = useSession()
  const [leaving, setLeaving] = useState(false)

  return (
    <div className="flex h-full flex-col gap-12 px-6 py-8">
      <div className="hidden items-center gap-3 lg:flex">
        <Isotype className="h-6 w-auto" />
        <span className="font-display text-xl font-light tracking-headline">HODEX</span>
      </div>

      <nav aria-label="Principal" className="flex flex-1 flex-col gap-10">
        {NAV.map(({ section, items }) => (
          <div key={section} className="flex flex-col gap-3">
            <Eyebrow dark>{section}</Eyebrow>
            <ul className="flex flex-col">
              {items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      `group relative flex items-baseline gap-4 py-2.5 pl-4 transition-colors duration-300 ${
                        isActive ? 'text-hodex-white' : 'text-hodex-white/55 hover:text-hodex-white'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {/* Marcador de sección activa: hairline vertical. */}
                        <span
                          aria-hidden="true"
                          className={`absolute top-1/2 left-0 h-4 w-px -translate-y-1/2 bg-hodex-white transition-transform duration-300 ${
                            isActive ? 'scale-y-100' : 'scale-y-0'
                          }`}
                        />
                        <span className="text-[11px] text-hodex-white/30 tabular-nums">
                          {item.number}
                        </span>
                        <span className="font-display text-lg font-light tracking-headline">
                          {item.label}
                        </span>
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="flex flex-col gap-4 border-t border-hodex-line-dark pt-6">
        <p className="truncate text-small text-hodex-white/55" title={user.email}>
          {user.email}
        </p>
        <Button
          variant="outline-dark"
          fullWidth
          loading={leaving}
          loadingLabel="Cerrando…"
          onClick={() => {
            setLeaving(true)
            void logout()
          }}
        >
          Cerrar sesión
        </Button>
      </div>
    </div>
  )
}

/**
 * Estructura del panel: barra lateral negra fija en escritorio; en móvil, barra
 * superior con menú desplegable. El contenido va sobre off-white.
 */
export function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false)

  // Bloquear el scroll del fondo con el menú móvil abierto.
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  return (
    <div className="min-h-svh">
      <a
        href="#contenido"
        className="sr-only bg-hodex-white px-4 py-2 text-small focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50"
      >
        Saltar al contenido
      </a>

      {/* ===== Escritorio: barra lateral fija ===== */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 bg-hodex-black text-hodex-white lg:block">
        <SidebarContent />
      </aside>

      {/* ===== Móvil: barra superior + menú ===== */}
      <header className="sticky top-0 z-40 flex items-center justify-between bg-hodex-black px-6 py-4 text-hodex-white lg:hidden">
        <div className="flex items-center gap-3">
          <Isotype className="h-5 w-auto" />
          <span className="font-display text-lg font-light tracking-headline">HODEX</span>
        </div>
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={menuOpen}
          aria-controls="menu-movil"
          className="flex h-8 w-8 flex-col items-center justify-center gap-[6px]"
        >
          <span
            className={`h-px w-5 bg-hodex-white transition-all duration-300 ${menuOpen ? 'translate-y-[7px] rotate-45' : ''}`}
          />
          <span
            className={`h-px w-5 bg-hodex-white transition-all duration-300 ${menuOpen ? 'opacity-0' : ''}`}
          />
          <span
            className={`h-px w-5 bg-hodex-white transition-all duration-300 ${menuOpen ? '-translate-y-[7px] -rotate-45' : ''}`}
          />
        </button>
      </header>
      <div
        id="menu-movil"
        hidden={!menuOpen}
        className="fixed inset-x-0 top-[64px] bottom-0 z-30 overflow-y-auto border-t border-hodex-line-dark bg-hodex-black text-hodex-white lg:hidden"
      >
        {menuOpen && <SidebarContent onNavigate={() => setMenuOpen(false)} />}
      </div>

      {/* ===== Contenido ===== */}
      <main id="contenido" className="lg:pl-64">
        <div className="mx-auto max-w-[1200px] px-6 py-10 md:px-12 md:py-14">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
