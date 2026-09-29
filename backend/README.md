# Hodex — Backend

API REST del proyecto Hodex. Node + TypeScript (ESM) con Express 5, arquitectura
modular por capas, validación con Zod y seguridad por defecto.

## Stack

- **Express 5** + **TypeScript** (ESM, `NodeNext`)
- **Zod** — validación de entrada y de variables de entorno
- **Helmet** + **CORS** + **express-rate-limit** — seguridad
- **Pino** — logging estructurado
- **Nodemailer** — envío de email (desacoplado)

## Estructura

```
src/
├── index.ts              # Arranque del servidor (+ graceful shutdown)
├── app.ts                # Construcción de la app Express (testable)
├── config/env.ts         # Carga y validación de variables de entorno
├── db/                   # Postgres: client, migrate y schema/ (Drizzle)
├── lib/                  # Transversales: logger, AppError, crypto, totp, password
├── middleware/           # errorHandler, notFound, rateLimit, adminGateway, requireSameOrigin, noStore
├── services/             # email (Resend/SMTP/consola) y audit (registro de auditoría)
├── routes/index.ts       # Router raíz (/api)
├── scripts/              # CLI: create-admin
└── modules/              # Un módulo por dominio
    ├── admin/            # /api/admin: gateway + CSRF + sesión (router del panel)
    ├── auth/             # Login 2FA, sesiones, códigos de recuperación
    ├── health/           # GET /api/health
    └── contact/          # POST /api/contact  (schema→service→controller→routes)
```

**Añadir un módulo nuevo:** crea `modules/<nombre>/` con su `schema`, `service`,
`controller` y `routes`, y móntalo en `routes/index.ts`.

## Puesta en marcha

```bash
cp .env.example .env      # ajusta valores
npm install
npm run dev               # desarrollo con recarga (tsx watch)
```

Otros scripts: `npm run build` (compila a `dist/`), `npm start` (producción),
`npm run typecheck`.

## Base de datos

**Postgres + Drizzle ORM.** El esquema vive en `src/db/schema/` y las migraciones
SQL generadas en `drizzle/` (versionadas en git: se revisan como cualquier código).

```bash
docker compose up -d db          # (desde la raíz) Postgres local en 127.0.0.1:5434
npm run db:migrate               # aplica migraciones pendientes
npm run db:generate -- --name=x  # genera migración tras cambiar el esquema
npm run db:studio                # explorador visual (solo local)
```

- **Producción (Railway):** las migraciones se aplican en el _pre-deploy_ con
  `npm run db:migrate:prod`. Si fallan, la versión nueva no se publica.
- **`audit_log` es de solo inserción:** un trigger rechaza UPDATE/DELETE/TRUNCATE.
- **Tests de integración** (se omiten si no hay `TEST_DATABASE_URL`):

  ```bash
  docker compose exec db createdb -U hodex hodex_test   # una sola vez
  TEST_DATABASE_URL=postgres://hodex:hodex_dev_only@localhost:5434/hodex_test npm test
  ```

## Panel de gestión: autenticación

Todo vive bajo `/api/admin` y pasa por estas capas (`modules/admin/admin.routes.ts`):

1. **Gateway** — solo acepta peticiones del nginx de `admin.hodex.es` (cabecera
   secreta `X-Hodex-Gateway`); el resto recibe 404. Si falta configuración, 404.
2. **Sin caché** — `Cache-Control: no-store` en todas las respuestas.
3. **CSRF** — escrituras con `Origin` exacto + cabecera `X-Hodex-Request: 1`.
4. **Sesión** — cookie `__Host-hodex_session` (HttpOnly, Secure, SameSite=Strict).

**Login en dos pasos** (`modules/auth/`):

| Endpoint | Qué hace |
| --- | --- |
| `POST /auth/login` | Email + contraseña (argon2id). Si es correcta, cookie de desafío de 5 min. |
| `POST /auth/login/verify` | Código TOTP o de recuperación → crea la sesión. |
| `GET /auth/session` | Usuario y caducidad de la sesión. |
| `POST /auth/reauth` | Vuelve a pedir el 2FA (acciones sensibles, 10 min). |
| `POST /auth/logout` · `/auth/logout-others` | Cierra la sesión actual · las demás. |

Políticas (en `auth.config.ts`): sesión de 30 min de inactividad / 12 h máximo;
5 fallos → bloqueo de 15 min que se duplica hasta 1 h; 10 intentos/15 min por
IP; códigos TOTP de un solo uso; aviso por email de cada inicio de sesión,
bloqueo o uso de código de recuperación; todo queda en `audit_log`.

**Crear la cuenta** (no hay registro público):

```bash
npm run admin:create                      # local
railway ssh --service backend             # producción, dentro del contenedor:
npm run admin:create:prod
```

## Endpoints

| Método | Ruta           | Descripción                    |
| ------ | -------------- | ------------------------------ |
| GET    | `/api/health`  | Estado del servicio            |
| POST   | `/api/contact` | Envío del formulario (limitado)|

### `POST /api/contact`

```json
{
  "name": "Gorka",
  "email": "gorka@hodex.es",
  "company": "Hodex",
  "message": "Queremos construir un producto digital con IA.",
  "intent": "empresa"
}
```

`intent` ∈ `empresa | automatizar | creador | otro`. Respuesta `201`:
`{ "ok": true, "message": "Mensaje recibido. Te responderemos en breve." }`.

## Email

Sin variables `SMTP_*`/`CONTACT_TO`, los envíos se **registran en consola** (útil
en local). Al rellenarlas, se envían por SMTP real. Ver `.env.example`.
