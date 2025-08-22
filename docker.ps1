# 🐳 DOCKER MANAGEMENT SCRIPTS ENTERPRISE - PowerShell
# Scripts para manejo de contenedores en Windows

param(
    [Parameter(Position=0)]
    [string]$Command,
    
    [Parameter(Position=1)]
    [string]$Service
)

# Función para logging con colores
function Write-Log {
    param([string]$Message, [string]$Color = "Green")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$timestamp] $Message" -ForegroundColor $Color
}

function Write-Error-Log {
    param([string]$Message)
    Write-Log $Message "Red"
}

function Write-Warning-Log {
    param([string]$Message)
    Write-Log $Message "Yellow"
}

# Verificar que Docker esté corriendo
function Test-Docker {
    try {
        docker info | Out-Null
        return $true
    }
    catch {
        Write-Error-Log "Docker no está corriendo. Por favor inicia Docker Desktop."
        exit 1
    }
}

# Verificar archivos de entorno
function Test-EnvFile {
    if (-not (Test-Path ".env")) {
        Write-Warning-Log "Archivo .env no encontrado. Copiando desde .env.example..."
        Copy-Item ".env.example" ".env"
        Write-Warning-Log "⚠️  IMPORTANTE: Edita el archivo .env con tus configuraciones antes de continuar."
        Read-Host "Presiona Enter cuando hayas configurado el archivo .env"
    }
}

# ================================
# COMANDOS DE DESARROLLO
# ================================

function Start-Development {
    Write-Log "🚀 Iniciando entorno de desarrollo..."
    Test-Docker
    Test-EnvFile
    
    docker-compose -f docker-compose.yml up -d
    
    Write-Log "✅ Entorno de desarrollo iniciado"
    Write-Log "📊 Frontend: http://localhost:3000"
    Write-Log "🔧 Backend API: http://localhost:3001"
    Write-Log "🗄️  Adminer: http://localhost:8080"
    Write-Log "📊 Redis Commander: http://localhost:8081"
}

function Stop-Development {
    Write-Log "🛑 Deteniendo entorno de desarrollo..."
    docker-compose -f docker-compose.yml down
    Write-Log "✅ Entorno de desarrollo detenido"
}

function Restart-Development {
    Write-Log "🔄 Reiniciando entorno de desarrollo..."
    Stop-Development
    Start-Development
}

function Show-DevelopmentLogs {
    param([string]$ServiceName)
    if ($ServiceName) {
        docker-compose -f docker-compose.yml logs -f $ServiceName
    } else {
        docker-compose -f docker-compose.yml logs -f
    }
}

# ================================
# COMANDOS DE PRODUCCIÓN
# ================================

function Start-Production {
    Write-Log "🚀 Iniciando entorno de producción..."
    Test-Docker
    
    if (-not (Test-Path ".env.production")) {
        Write-Error-Log "Archivo .env.production no encontrado. Créalo antes de continuar."
        exit 1
    }
    
    docker-compose -f docker-compose.prod.yml up -d
    
    Write-Log "✅ Entorno de producción iniciado"
    Write-Log "🌐 Aplicación: http://localhost"
}

function Stop-Production {
    Write-Log "🛑 Deteniendo entorno de producción..."
    docker-compose -f docker-compose.prod.yml down
    Write-Log "✅ Entorno de producción detenido"
}

# ================================
# COMANDOS DE MANTENIMIENTO
# ================================

function Clear-Everything {
    Write-Log "🧹 Limpiando contenedores, imágenes y volúmenes..."
    
    # Detener todos los contenedores
    try {
        docker-compose -f docker-compose.yml down -v 2>$null
        docker-compose -f docker-compose.prod.yml down -v 2>$null
    } catch {
        # Ignorar errores si no hay contenedores
    }
    
    # Remover imágenes del proyecto
    try {
        $images = docker images --format "table {{.Repository}}:{{.Tag}}\t{{.ID}}" | Select-String "bikeshop" | ForEach-Object { ($_ -split '\s+')[1] }
        if ($images) {
            docker rmi -f $images
        }
    } catch {
        # Ignorar errores
    }
    
    # Limpiar sistema Docker
    docker system prune -f
    
    Write-Log "✅ Limpieza completada"
}

function Rebuild-Images {
    Write-Log "🔨 Reconstruyendo imágenes..."
    docker-compose -f docker-compose.yml build --no-cache
    Write-Log "✅ Imágenes reconstruidas"
}

function Show-Status {
    Write-Log "📊 Estado de contenedores de desarrollo:"
    docker-compose -f docker-compose.yml ps
    
    Write-Host ""
    Write-Log "📊 Estado de contenedores de producción:"
    try {
        docker-compose -f docker-compose.prod.yml ps
    } catch {
        Write-Host "No hay contenedores de producción corriendo"
    }
}

function Create-Backup {
    Write-Log "💾 Creando backup de base de datos..."
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $backupFile = "backup_$timestamp.sql"
    
    docker-compose exec postgres pg_dump -U bikeshop_user bikeshop_db > $backupFile
    
    Write-Log "✅ Backup creado: $backupFile"
}

# ================================
# MENÚ PRINCIPAL
# ================================

function Show-Help {
    Write-Host "🐳 BikeShop ERP - Docker Management" -ForegroundColor Blue
    Write-Host ""
    Write-Host "Comandos de desarrollo:"
    Write-Host "  dev:up      - Iniciar entorno de desarrollo"
    Write-Host "  dev:down    - Detener entorno de desarrollo"
    Write-Host "  dev:restart - Reiniciar entorno de desarrollo"
    Write-Host "  dev:logs    - Ver logs (opcional: servicio específico)"
    Write-Host ""
    Write-Host "Comandos de producción:"
    Write-Host "  prod:up     - Iniciar entorno de producción"
    Write-Host "  prod:down   - Detener entorno de producción"
    Write-Host ""
    Write-Host "Comandos de mantenimiento:"
    Write-Host "  status      - Ver estado de contenedores"
    Write-Host "  rebuild     - Reconstruir imágenes"
    Write-Host "  clean       - Limpiar todo (⚠️  destructivo)"
    Write-Host "  backup      - Crear backup de base de datos"
    Write-Host ""
    Write-Host "Uso: .\docker.ps1 [comando] [servicio]"
}

# ================================
# ROUTER DE COMANDOS
# ================================

switch ($Command) {
    "dev:up" {
        Start-Development
    }
    "dev:down" {
        Stop-Development
    }
    "dev:restart" {
        Restart-Development
    }
    "dev:logs" {
        Show-DevelopmentLogs $Service
    }
    "prod:up" {
        Start-Production
    }
    "prod:down" {
        Stop-Production
    }
    "status" {
        Show-Status
    }
    "rebuild" {
        Rebuild-Images
    }
    "clean" {
        Write-Host "⚠️  Esta operación eliminará todos los contenedores y volúmenes." -ForegroundColor Red
        $confirm = Read-Host "¿Estás seguro? (y/N)"
        if ($confirm -eq "y" -or $confirm -eq "Y") {
            Clear-Everything
        } else {
            Write-Log "Operación cancelada"
        }
    }
    "backup" {
        Create-Backup
    }
    default {
        Show-Help
    }
}
