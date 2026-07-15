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
├── lib/                  # Utilidades transversales (logger, AppError)
├── middleware/           # errorHandler, notFound, rateLimit
├── services/email.ts     # Servicio de email (SMTP o modo consola)
├── routes/index.ts       # Router raíz (/api)
└── modules/              # Un módulo por dominio
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
