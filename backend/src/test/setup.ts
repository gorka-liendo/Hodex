/**
 * Entorno de test. Se ejecuta antes de que cada archivo de test importe la app,
 * así que estas variables tienen prioridad sobre cualquier `.env` local
 * (dotenv nunca sobrescribe variables ya definidas).
 *
 * La base de datos SOLO se habilita si hay TEST_DATABASE_URL: así los tests
 * jamás tocan la base de datos de desarrollo aunque exista en `.env`.
 */
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? ''

// Claves fijas y solo para tests.
process.env.AUTH_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64')
process.env.ADMIN_GATEWAY_SECRET = 'test-gateway-secret-0123456789abcdef'
process.env.ADMIN_ORIGIN = 'http://localhost:5174'
