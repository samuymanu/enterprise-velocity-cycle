# 🐳 GUÍA DE INSTALACIÓN Y CONFIGURACIÓN DOCKER

## Prerequisitos para Fase 3

### 1. 📦 Instalar Docker Desktop (Windows)

1. **Descargar Docker Desktop**:
   - Ir a https://docs.docker.com/desktop/install/windows/
   - Descargar Docker Desktop para Windows

2. **Instalar Docker Desktop**:
   - Ejecutar el instalador como administrador
   - Seguir las instrucciones del asistente
   - Reiniciar el sistema si es necesario

3. **Verificar WSL 2** (requerido por Docker):
   ```powershell
   # Verificar versión de WSL
   wsl --list --verbose
   
   # Si no tienes WSL 2, instalarlo:
   wsl --install
   ```

4. **Iniciar Docker Desktop**:
   - Buscar "Docker Desktop" en el menú inicio
   - Iniciar la aplicación
   - Esperar que el indicador en la barra de tareas sea verde

5. **Verificar instalación**:
   ```powershell
   docker --version
   docker-compose --version
   ```

### 2. 🔧 Configuración de Desarrollo

Una vez que Docker esté instalado:

1. **Configurar variables de entorno**:
   ```powershell
   # Copiar archivo de ejemplo
   Copy-Item .env.example .env
   
   # Editar .env con tus configuraciones
   notepad .env
   ```

2. **Construir y ejecutar contenedores**:
   ```powershell
   # Método 1: Usar script PowerShell
   .\docker.ps1 dev:up
   
   # Método 2: Docker Compose directo
   docker-compose up -d
   ```

3. **Verificar servicios corriendo**:
   ```powershell
   .\docker.ps1 status
   ```

### 3. 🌐 URLs de servicios

Después del despliegue exitoso:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Adminer (DB Admin)**: http://localhost:8080
- **Redis Commander**: http://localhost:8081

### 4. 🛠️ Comandos útiles

```powershell
# Ver logs de todos los servicios
.\docker.ps1 dev:logs

# Ver logs de un servicio específico
.\docker.ps1 dev:logs backend

# Reiniciar todo
.\docker.ps1 dev:restart

# Limpiar todo (⚠️ destructivo)
.\docker.ps1 clean
```

### 5. 🔍 Troubleshooting

**Problema**: "docker: command not found"
- **Solución**: Instalar Docker Desktop y reiniciar terminal

**Problema**: "Cannot connect to the Docker daemon"
- **Solución**: Iniciar Docker Desktop desde el menú inicio

**Problema**: "Port already in use"
- **Solución**: Cambiar puertos en .env o detener servicios conflictivos

**Problema**: "WSL 2 not found"
- **Solución**: Instalar WSL 2 siguiendo la guía de Microsoft

### 6. 📋 Próximos pasos

Una vez que Docker esté funcionando:

1. ✅ **Containerización** (Completado)
2. 🔄 **CI/CD Pipeline** (Siguiente paso)
   - GitHub Actions
   - Tests automáticos
   - Deploy automático

---

## 🚨 IMPORTANTE

- Los contenedores están optimizados para producción
- Las configuraciones de seguridad están habilitadas
- Los health checks monitoran el estado de los servicios
- Los volúmenes persisten los datos entre reinicios
