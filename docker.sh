#!/bin/bash
# 🐳 DOCKER MANAGEMENT SCRIPTS ENTERPRISE
# Scripts para manejo de contenedores en desarrollo y producción

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para logging
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

# Verificar que Docker esté corriendo
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        error "Docker no está corriendo. Por favor inicia Docker Desktop."
        exit 1
    fi
}

# Verificar archivos de entorno
check_env() {
    if [ ! -f .env ]; then
        warning "Archivo .env no encontrado. Copiando desde .env.example..."
        cp .env.example .env
        warning "⚠️  IMPORTANTE: Edita el archivo .env con tus configuraciones antes de continuar."
        read -p "Presiona Enter cuando hayas configurado el archivo .env..."
    fi
}

# ================================
# COMANDOS DE DESARROLLO
# ================================

# Iniciar entorno de desarrollo
dev_up() {
    log "🚀 Iniciando entorno de desarrollo..."
    check_docker
    check_env
    
    docker-compose -f docker-compose.yml up -d
    
    log "✅ Entorno de desarrollo iniciado"
    log "📊 Frontend: http://localhost:3000"
    log "🔧 Backend API: http://localhost:3001"
    log "🗄️  Adminer: http://localhost:8080"
    log "📊 Redis Commander: http://localhost:8081"
}

# Detener entorno de desarrollo
dev_down() {
    log "🛑 Deteniendo entorno de desarrollo..."
    docker-compose -f docker-compose.yml down
    log "✅ Entorno de desarrollo detenido"
}

# Reiniciar entorno de desarrollo
dev_restart() {
    log "🔄 Reiniciando entorno de desarrollo..."
    dev_down
    dev_up
}

# Ver logs de desarrollo
dev_logs() {
    docker-compose -f docker-compose.yml logs -f $1
}

# ================================
# COMANDOS DE PRODUCCIÓN
# ================================

# Iniciar entorno de producción
prod_up() {
    log "🚀 Iniciando entorno de producción..."
    check_docker
    
    if [ ! -f .env.production ]; then
        error "Archivo .env.production no encontrado. Créalo antes de continuar."
        exit 1
    fi
    
    docker-compose -f docker-compose.prod.yml up -d
    
    log "✅ Entorno de producción iniciado"
    log "🌐 Aplicación: http://localhost"
}

# Detener entorno de producción
prod_down() {
    log "🛑 Deteniendo entorno de producción..."
    docker-compose -f docker-compose.prod.yml down
    log "✅ Entorno de producción detenido"
}

# ================================
# COMANDOS DE MANTENIMIENTO
# ================================

# Limpiar todo
clean() {
    log "🧹 Limpiando contenedores, imágenes y volúmenes..."
    
    # Detener todos los contenedores
    docker-compose -f docker-compose.yml down -v 2>/dev/null || true
    docker-compose -f docker-compose.prod.yml down -v 2>/dev/null || true
    
    # Remover imágenes del proyecto
    docker images | grep bikeshop | awk '{print $3}' | xargs docker rmi -f 2>/dev/null || true
    
    # Limpiar sistema Docker
    docker system prune -f
    
    log "✅ Limpieza completada"
}

# Rebuild de imágenes
rebuild() {
    log "🔨 Reconstruyendo imágenes..."
    docker-compose -f docker-compose.yml build --no-cache
    log "✅ Imágenes reconstruidas"
}

# Ver estado de contenedores
status() {
    log "📊 Estado de contenedores:"
    docker-compose -f docker-compose.yml ps
    echo ""
    log "📊 Estado de contenedores de producción:"
    docker-compose -f docker-compose.prod.yml ps 2>/dev/null || echo "No hay contenedores de producción corriendo"
}

# Backup de base de datos
backup() {
    log "💾 Creando backup de base de datos..."
    timestamp=$(date +%Y%m%d_%H%M%S)
    backup_file="backup_${timestamp}.sql"
    
    docker-compose exec postgres pg_dump -U bikeshop_user bikeshop_db > $backup_file
    
    log "✅ Backup creado: $backup_file"
}

# ================================
# MENÚ PRINCIPAL
# ================================

show_help() {
    echo -e "${BLUE}🐳 BikeShop ERP - Docker Management${NC}"
    echo ""
    echo "Comandos de desarrollo:"
    echo "  dev:up      - Iniciar entorno de desarrollo"
    echo "  dev:down    - Detener entorno de desarrollo"
    echo "  dev:restart - Reiniciar entorno de desarrollo"
    echo "  dev:logs    - Ver logs (opcional: servicio específico)"
    echo ""
    echo "Comandos de producción:"
    echo "  prod:up     - Iniciar entorno de producción"
    echo "  prod:down   - Detener entorno de producción"
    echo ""
    echo "Comandos de mantenimiento:"
    echo "  status      - Ver estado de contenedores"
    echo "  rebuild     - Reconstruir imágenes"
    echo "  clean       - Limpiar todo (⚠️  destructivo)"
    echo "  backup      - Crear backup de base de datos"
    echo ""
    echo "Uso: ./docker.sh [comando]"
}

# ================================
# ROUTER DE COMANDOS
# ================================

case "${1}" in
    "dev:up")
        dev_up
        ;;
    "dev:down")
        dev_down
        ;;
    "dev:restart")
        dev_restart
        ;;
    "dev:logs")
        dev_logs $2
        ;;
    "prod:up")
        prod_up
        ;;
    "prod:down")
        prod_down
        ;;
    "status")
        status
        ;;
    "rebuild")
        rebuild
        ;;
    "clean")
        echo -e "${RED}⚠️  Esta operación eliminará todos los contenedores y volúmenes.${NC}"
        read -p "¿Estás seguro? (y/N): " confirm
        if [[ $confirm == [yY] ]]; then
            clean
        else
            log "Operación cancelada"
        fi
        ;;
    "backup")
        backup
        ;;
    *)
        show_help
        ;;
esac
