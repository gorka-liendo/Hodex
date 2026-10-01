# syntax=docker/dockerfile:1

# ─── Stage 1: build estático con Vite ────────────────────────
FROM node:24-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ─── Stage 2: nginx sin privilegios (usuario 101, nunca root) ─
FROM nginxinc/nginx-unprivileged:1.28-alpine AS runner

# PORT lo sobrescribe Railway. La imagen calcula NGINX_LOCAL_RESOLVERS a partir
# del DNS del contenedor cuando se activa este flag.
ENV PORT=8080 \
    NGINX_ENTRYPOINT_LOCAL_RESOLVERS=1

COPY nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/healthz" >/dev/null 2>&1 || exit 1
