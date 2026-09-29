import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'

// Panel de gestión (admin.hodex.es). Puerto 5174 = ADMIN_ORIGIN por defecto del
// backend: el Origin que envía el navegador en local coincide con el esperado.
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    babel({ presets: [reactCompilerPreset()] }),
  ],
  server: {
    port: 5174,
    strictPort: true,
    proxy: {
      // Solo la API del panel; en producción lo hace el nginx del gateway.
      '/api/admin': {
        target: process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:4000',
      },
    },
  },
  preview: { port: 5174, strictPort: true },
})
