# Hodex — Panel de gestión (`admin.hodex.es`)

App privada para gestionar la empresa (clientes, facturas, gastos…). React 19 +
Vite + Tailwind v4 con el mismo design system que la landing (ver `CLAUDE.md`).

## Desarrollo

```bash
docker compose up -d db                        # (raíz) Postgres local
cd backend && npm run dev                      # API (puerto de backend/.env)
cd admin && npm run dev                        # panel en http://localhost:5174
```

Vite reenvía `/api/admin` al backend (`VITE_API_PROXY_TARGET`, por defecto
`http://localhost:4000`). El puerto 5174 coincide con el `ADMIN_ORIGIN` que
espera el backend. Crea tu cuenta local con `cd backend && npm run admin:create`.

`npm run lint` incluye `check:tokens`: falla si `src/styles/tokens.css` se
desincroniza de `frontend/src/index.css` (la fuente de verdad de la marca).

## Estructura

```
src/
├── api/          # cliente HTTP (X-Hodex-Request, errores con código) + endpoints
├── auth/         # AuthProvider, useAuth/useSession, guards de rutas
├── components/   # piezas de marca: Button, TextField, Notice, PageHeader, brand
├── layout/       # AppShell (sidebar negra + menú móvil)
├── pages/        # Login (2 pasos), Resumen, Seguridad, módulos
├── lib/          # formatos (es-ES, Europe/Madrid)
└── styles/       # tokens.css (copia de la landing) + index.css
nginx/            # gateway de producción + cabeceras de seguridad
```

## Producción (Railway)

Imagen `nginxinc/nginx-unprivileged` (no corre como root) que sirve el build y
actúa de **gateway**: reenvía solo `/api/admin/*` al backend por la red privada
añadiendo el secreto `X-Hodex-Gateway`. Variables:

| Variable | Ejemplo |
| --- | --- |
| `BACKEND_URL` | `http://backend.railway.internal:4000` |
| `ADMIN_GATEWAY_SECRET` | el mismo valor que en el backend |
| `PORT` | la inyecta Railway |

Seguridad del navegador: CSP `'self'` sin excepciones (sin scripts ni estilos en
línea, sin terceros; Onest servida localmente) con Trusted Types, HSTS,
`frame-ancestors 'none'`, `no-referrer`, `noindex` y `index.html` sin caché.
