# 🐳 DOCKERFILE ENTERPRISE - FRONTEND
# Multi-stage build optimizado para producción Vite/React

# ================================
# STAGE 1: Builder
# ================================
FROM node:20-alpine AS builder
LABEL stage=builder
WORKDIR /app

# Instalar dependencias del sistema para build
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    && rm -rf /var/cache/apk/*

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm ci --include=dev

# Copiar código fuente
COPY . .

# Build optimizado para producción
RUN npm run build

# ================================
# STAGE 2: Production Server
# ================================
FROM nginx:1.25-alpine AS production
LABEL maintainer="BikeShop ERP Team"
LABEL version="1.0.0"
LABEL stage=production

# Instalar dependencias adicionales
RUN apk add --no-cache \
    dumb-init \
    ca-certificates \
    && rm -rf /var/cache/apk/*

# Copiar configuración personalizada de Nginx
COPY nginx.conf /etc/nginx/nginx.conf
COPY nginx-default.conf /etc/nginx/conf.d/default.conf

# Copiar archivos buildados desde stage anterior
COPY --from=builder /app/dist /usr/share/nginx/html

# Crear usuario no-root
RUN addgroup -g 1001 -S nginx && \
    adduser -S nginx -u 1001 -G nginx

# Configurar permisos
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d

RUN touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:80/health || exit 1

# Cambiar a usuario no-root
USER nginx

# Exponer puerto
EXPOSE 80

# Usar dumb-init para manejo correcto de señales
ENTRYPOINT ["dumb-init", "--"]

# Comando de inicio
CMD ["nginx", "-g", "daemon off;"]
