# syntax=docker/dockerfile:1

# ─── Stage 1: build estático con Vite ────────────────────────
FROM node:24-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ─── Stage 2: servir con nginx ───────────────────────────────
FROM nginx:1.27-alpine AS runner
# Config propia: SPA fallback + proxy /api → backend + gzip + caché.
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO- http://localhost/ >/dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]
