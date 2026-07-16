# syntax=docker/dockerfile:1

# ─── Stage 1: build (TS → dist) ──────────────────────────────
FROM node:24-alpine AS builder
WORKDIR /app
# Instala todas las deps (incluye dev: typescript) con caché de capa.
COPY package*.json ./
RUN npm ci
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

# ─── Stage 2: solo dependencias de producción ────────────────
FROM node:24-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# ─── Stage 3: runtime mínimo ─────────────────────────────────
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000

# Copia solo lo necesario: node_modules de prod + build compilado.
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package.json ./

# Ejecuta como usuario sin privilegios (incluido en la imagen node).
USER node

EXPOSE 4000

# Healthcheck contra el propio endpoint /api/health (Node 24 trae fetch global).
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:'+(process.env.PORT||4000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# CMD directo a node (no npm) para que las señales lleguen al proceso.
CMD ["node", "dist/index.js"]
