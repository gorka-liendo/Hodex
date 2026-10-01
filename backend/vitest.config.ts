import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Fija las variables de entorno de test antes de importar la app.
    setupFiles: ['./src/test/setup.ts'],
    // Los tests de integración comparten la misma base de datos de test.
    fileParallelism: false,
  },
})
