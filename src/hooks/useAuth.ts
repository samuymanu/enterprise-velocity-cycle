import { useState, useEffect } from 'react';
import authManager from '@/lib/authManager';

/**
 * Hook personalizado para manejar autenticación de forma consistente
 * en todos los componentes que la necesiten
 */
export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(authManager.hasValidToken());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const authenticate = async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const success = await authManager.ensureAuthenticated();
      setIsAuthenticated(success);

      if (!success) {
        const timeRemaining = authManager.getTimeUntilNextAttempt();
        if (timeRemaining > 0) {
          const seconds = Math.ceil(timeRemaining / 1000);
          setError(`Rate limit activo. Próximo intento en ${seconds}s`);
        } else if (authManager.isLoginInProgress()) {
          setError('Autenticación en progreso...');
        } else {
          setError('No se pudo autenticar. Inténtalo más tarde.');
        }
      }

      return success;
    } catch (err: any) {
      setError(err.message || 'Error de autenticación');
      setIsAuthenticated(false);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    authManager.clearAuth();
    setIsAuthenticated(false);
    setError(null);
  };

  const clearError = () => {
    setError(null);
  };

  // Efecto para verificar cambios en el estado de autenticación
  useEffect(() => {
    const checkAuthStatus = () => {
      const hasToken = authManager.hasValidToken();
      if (hasToken !== isAuthenticated) {
        setIsAuthenticated(hasToken);
      }
    };

    // Verificar cada 5 segundos si el estado cambió
    const interval = setInterval(checkAuthStatus, 5000);
    
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  return {
    isAuthenticated,
    isLoading,
    error,
    authenticate,
    logout,
    clearError,
    isLoginInProgress: authManager.isLoginInProgress(),
    timeUntilNextAttempt: authManager.getTimeUntilNextAttempt()
  };
};

export default useAuth;
