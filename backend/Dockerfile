# 🐳 DOCKERFILE ENTERPRISE - BACKEND
# Multi-stage build optimizado para producción

# ================================
# STAGE 1: Builder (Dependencies)
# ================================
FROM node:20-alpine AS builder
LABEL stage=builder
WORKDIR /app

# Instalar dependencias del sistema para build
RUN apk add --no-cache openssl

# Copiar archivos de dependencias
COPY package*.json ./
COPY prisma ./prisma/

# Instalar todas las dependencias (dev + prod)
RUN npm ci --include=dev

# Generar Prisma Client
RUN npx prisma generate

# Copiar código fuente
COPY . .

# Build del proyecto TypeScript
RUN npm run build

# ================================
# STAGE 2: Production Runtime
# ================================
FROM node:20-alpine AS production
LABEL maintainer="BikeShop ERP Team"
LABEL version="1.0.0"
LABEL stage=production

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=3001
ENV LOG_LEVEL=info

# Crear usuario no-root para seguridad
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001

# Instalar dependencias del sistema
RUN apk add --no-cache \
    dumb-init \
    openssl \
    ca-certificates && \
    rm -rf /var/cache/apk/*

WORKDIR /app

# Copiar package files y instalar solo dependencias de producción
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copiar Prisma schema y generar cliente
COPY prisma ./prisma/
RUN npx prisma generate
