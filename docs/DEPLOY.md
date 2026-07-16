# Despliegue — Hodex

Arquitectura: **frontend estático en Vercel** + **backend Express en Railway** +
**Resend** como SMTP. El frontend llama a `/api/...` y un rewrite de Vercel lo
proxya al backend — mismo origen, sin CORS en el navegador.

## 1. Resend (correo)

1. Crear cuenta en [resend.com](https://resend.com).
2. **Domains → Add domain** → `hodex.es`. Añadir los registros DNS que indica
   (SPF + DKIM) en el proveedor del dominio y esperar a "Verified".
3. **API Keys → Create API key** (permiso "Sending access"). Guardarla.

Credenciales SMTP de Resend: host `smtp.resend.com`, puerto `465` (secure),
usuario literal `resend`, contraseña = la API key.

## 2. Railway (backend)

1. [railway.app](https://railway.app) → **New Project → Deploy from GitHub repo**
   → elegir `gorka-liendo/Hodex`.
2. En el servicio: **Settings → Root Directory** = `backend`. Railway detecta el
   `Dockerfile` automáticamente. Branch de deploy: `main`.
3. **Variables** del servicio:

   | Variable       | Valor                                  |
   | -------------- | -------------------------------------- |
   | `NODE_ENV`     | `production`                           |
   | `CORS_ORIGIN`  | `https://hodex.es`                     |
   | `SMTP_HOST`    | `smtp.resend.com`                      |
   | `SMTP_PORT`    | `465`                                  |
   | `SMTP_SECURE`  | `true`                                 |
   | `SMTP_USER`    | `resend`                               |
   | `SMTP_PASS`    | *(API key de Resend)*                  |
   | `CONTACT_TO`   | `team@hodex.es`                        |
   | `CONTACT_FROM` | `Hodex <web@hodex.es>`                 |

   (`PORT` lo inyecta Railway solo; el backend ya lo lee. `CONTACT_FROM` debe
   ser del dominio verificado en Resend.)

4. **Settings → Networking → Generate Domain** → copiar la URL pública
   (`https://<algo>.up.railway.app`).
5. Comprobar: `https://<algo>.up.railway.app/api/health` debe responder
   `{"status":"ok",...}`.

## 3. Vercel (frontend)

1. Actualizar `frontend/vercel.json`: sustituir `TU-BACKEND.up.railway.app`
   por el dominio real de Railway del paso anterior. Commit + push.
2. [vercel.com](https://vercel.com) → **Add New → Project** → importar el repo.
3. **Root Directory** = `frontend`. Framework: Vite (autodetectado;
   build `npm run build`, output `dist`). Deploy.
4. **Settings → Domains** → añadir `hodex.es` (y `www.hodex.es` → redirect)
   con los DNS que indique Vercel.

## 4. Verificación end-to-end

1. Abrir la web → sección Contacto → enviar un mensaje de prueba.
2. Debe llegar a `team@hodex.es` con reply-to del remitente.
3. Si falla: logs del backend en Railway (si SMTP no está configurado, el
   backend loguea el mensaje en consola en vez de enviarlo).

## Desarrollo local

Sin cambios: `npm run dev` en `frontend/` (Vite proxya `/api` a
`localhost:4000`) + `docker compose up backend`, o todo junto con
`docker compose -f docker-compose.yml -f docker-compose.dev.yml up`.
