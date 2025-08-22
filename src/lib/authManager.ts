// Singleton para manejar autenticación global y evitar múltiples intentos de login
class AuthManager {
  private static instance: AuthManager;
  private isLoggingIn = false;
  private lastLoginAttempt = 0;
  private loginPromise: Promise<boolean> | null = null;
  private readonly MIN_TIME_BETWEEN_ATTEMPTS = 60000; // 1 minuto

  static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }

  // Verifica si hay un token válido sin hacer solicitudes
  hasValidToken(): boolean {
    const token = localStorage.getItem('authToken');
    return !!token;
  }

  // Método principal para login que evita múltiples intentos simultáneos
  async ensureAuthenticated(): Promise<boolean> {
    // Si ya hay un token, no necesitamos hacer login
    if (this.hasValidToken()) {
      return true;
    }

    // Si ya hay un login en progreso, esperar a que termine
    if (this.isLoggingIn && this.loginPromise) {
      console.log('AuthManager: Login ya en progreso, esperando...');
      return this.loginPromise;
    }

    // Verificar tiempo mínimo entre intentos
    const now = Date.now();
    const timeSinceLastAttempt = now - this.lastLoginAttempt;
    
    if (timeSinceLastAttempt < this.MIN_TIME_BETWEEN_ATTEMPTS) {
      const waitTime = Math.ceil((this.MIN_TIME_BETWEEN_ATTEMPTS - timeSinceLastAttempt) / 1000);
      console.log(`AuthManager: Esperando ${waitTime}s antes del próximo intento de login`);
      return false;
    }

    // Iniciar proceso de login
    this.isLoggingIn = true;
    this.lastLoginAttempt = now;
    
    this.loginPromise = this.performLogin();
    
    try {
      const result = await this.loginPromise;
      return result;
    } finally {
      this.isLoggingIn = false;
      this.loginPromise = null;
    }
  }

  private async performLogin(): Promise<boolean> {
    console.log('AuthManager: Intentando login automático...');
    
    try {
      // Importación dinámica para evitar dependencias circulares
      const apiModule = await import('./api');
      const apiService = apiModule.apiService;
      
      const result = await apiService.auth.login('admin@bikeshop.com', 'DevAdmin@2025!');
      console.log('AuthManager: Login exitoso', result);
      return true;
    } catch (error: any) {
      console.error('AuthManager: Error en login:', error);
      
      // Verificar si es un error de red
      if (error.message.includes('fetch') || error.message.includes('NetworkError')) {
        console.error('AuthManager: Error de conexión con el servidor');
        return false;
      }
      
      if (error.status === 429) {
        const retryAfter = error.retryAfter || 60;
        console.log(`AuthManager: Rate limit alcanzado. Próximo intento en ${retryAfter}s`);
        
        // Programar reinicio del flag después del tiempo de espera
        setTimeout(() => {
          this.lastLoginAttempt = 0;
          console.log('AuthManager: Rate limit period expired, ready for next attempt');
        }, retryAfter * 1000);
      }
      
      return false;
    }
  }

  // Limpiar estado de autenticación
  clearAuth(): void {
    localStorage.removeItem('authToken');
    this.isLoggingIn = false;
    this.loginPromise = null;
    this.lastLoginAttempt = 0;
  }

  // Verificar si está en proceso de login
  isLoginInProgress(): boolean {
    return this.isLoggingIn;
  }

  // Obtener tiempo restante hasta el próximo intento permitido
  getTimeUntilNextAttempt(): number {
    const now = Date.now();
    const timeSinceLastAttempt = now - this.lastLoginAttempt;
    const timeRemaining = this.MIN_TIME_BETWEEN_ATTEMPTS - timeSinceLastAttempt;
    return Math.max(0, timeRemaining);
  }
}

export const authManager = AuthManager.getInstance();
export default authManager;
