// React import (necesario para useState)
import { useState } from 'react';

// API Service para conectar con el backend
const DEFAULT_API_BASE = import.meta.env.DEV ? '/api' : 'http://localhost:3002/api';

// Optional runtime override (set from Settings UI)
let overrideApiBase: string | null = null;

function normalizeServerUrl(input: string) {
  if (!input) return null;
  let url = input.trim();
  if (!/^https?:\/\//i.test(url)) {
    url = 'http://' + url;
  }
  // remove trailing slash
  url = url.replace(/\/+$/, '');
  // ensure /api suffix
  if (!url.endsWith('/api')) {
    url = url + '/api';
  }
  return url;
}

function getApiBase() {
  if (overrideApiBase) return overrideApiBase;
  try {
    const stored = localStorage.getItem('app:apiUrl');
    const normalized = stored ? normalizeServerUrl(stored) : null;
    return normalized || DEFAULT_API_BASE;
  } catch (e) {
    return DEFAULT_API_BASE;
  }
}

export function setApiBaseUrl(value: string | null) {
  try {
    if (!value) {
      localStorage.removeItem('app:apiUrl');
      overrideApiBase = null;
      return;
    }
    const normalized = normalizeServerUrl(value as string);
    if (normalized) {
      localStorage.setItem('app:apiUrl', value as string);
      overrideApiBase = normalized;
    }
  } catch (e) {
    console.warn('setApiBaseUrl error', e);
  }
}

// Storage para el token
let authToken: string | null = localStorage.getItem('authToken');
// Intentar leer refreshToken si existe
let refreshTokenStored: string | null = localStorage.getItem('refreshToken');

// Configuración de timeouts y reintentos
const API_CONFIG = {
  timeout: 30000, // 30 segundos
  retries: 3,
  retryDelay: 1000, // 1 segundo
};

// Sistema de notificaciones (integrado con store)
interface ApiNotification {
  type: 'error' | 'success' | 'info' | 'warning';
  title: string;
  message: string;
  duration?: number;
  category?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// Interceptor de notificaciones
let notificationHandler: ((notification: ApiNotification) => void) | null = null;

export const setNotificationHandler = (handler: (notification: ApiNotification) => void) => {
  notificationHandler = handler;
};

// Helper para mostrar notificaciones
const notify = (notification: ApiNotification) => {
  if (notificationHandler) {
    notificationHandler(notification);
  }
};

// Helper functions para notificaciones específicas
const notifyError = (title: string, message: string, options: { category?: string } = {}) => {
  notify({
    type: 'error',
    title,
    message,
    category: options.category || 'api'
  });
};

const notifySuccess = (title: string, message: string, options: { category?: string } = {}) => {
  notify({
    type: 'success',
    title,
    message,
    category: options.category || 'api'
  });
};

// Función para retry con backoff exponencial
const withRetry = async <T>(
  operation: () => Promise<T>,
  retries: number = API_CONFIG.retries,
  delay: number = API_CONFIG.retryDelay
): Promise<T> => {
  try {
    return await operation();
  } catch (error: any) {
    // Para errores 429 (Rate Limiting), usar delay más largo
    if (error.status === 429) {
      const retryAfter = error.retryAfter || 60; // Default 60 segundos si no se especifica
      const rateLimitDelay = retryAfter * 1000; // Convertir a milisegundos
      
      if (retries > 0) {
        // Notificar al usuario sobre el rate limiting
        notifyError(
          `Rate limit alcanzado - Reintentando en ${retryAfter}s`,
          `Demasiadas solicitudes. Se reintentará automáticamente en ${retryAfter} segundos.`,
          { category: 'api' }
        );
        
        await new Promise(resolve => setTimeout(resolve, rateLimitDelay));
        return withRetry(operation, retries - 1, delay);
      } else {
        // Si no quedan reintentos, lanzar error específico
        throw new Error(`Rate limit alcanzado. Intenta nuevamente en ${retryAfter} segundos.`);
      }
    }
    
    // Para otros errores reintentables, usar la lógica normal
    if (retries > 0 && isRetryableError(error)) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(operation, retries - 1, delay * 2);
    }
    throw error;
  }
};

// Determinar si un error es reintentable
const isRetryableError = (error: any): boolean => {
  if (error.name === 'NetworkError') return true;
  if (error.status >= 500) return true;
  if (error.status === 429) return true; // Rate limiting
  return false;
};

// Headers comunes mejorados
const getHeaders = () => ({
  'Content-Type': 'application/json',
  ...(authToken && { 'Authorization': `Bearer ${authToken}` })
});

// Cache simple para requests GET
class ApiCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  
  set(key: string, data: any, ttl: number = 5 * 60 * 1000) { // 5 minutos por defecto
    this.cache.set(key, { data, timestamp: Date.now(), ttl });
  }
  
  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }
  
  clear() {
    this.cache.clear();
  }
  
  invalidate(pattern?: string) {
    if (!pattern) {
      this.cache.clear();
      return;
    }
    
    const keys = Array.from(this.cache.keys());
    keys.forEach(key => {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    });
  }
}

const apiCache = new ApiCache();

// Tipos para opciones extendidas de API
interface ApiRequestOptions extends Omit<RequestInit, 'cache'> {
  cache?: boolean;
  cacheTtl?: number;
  showSuccessNotification?: boolean;
  showErrorNotification?: boolean;
  loadingMessage?: string;
}

// Función helper para requests mejorada
const apiRequest = async (
  endpoint: string, 
  options: ApiRequestOptions = {}
) => {
  const {
    cache = false,
    cacheTtl,
    showSuccessNotification = false,
    showErrorNotification = true,
    loadingMessage,
    ...requestOptions
  } = options;

  const cacheKey = `${endpoint}_${JSON.stringify(requestOptions)}`;
  
  // Verificar cache para requests GET
  if (requestOptions.method === 'GET' || !requestOptions.method) {
    if (cache) {
      const cachedData = apiCache.get(cacheKey);
      if (cachedData) {
        return cachedData;
      }
    }
  }

  const headers: HeadersInit = getHeaders();

  // Si el body es FormData, el navegador establece el Content-Type automáticamente
  if (requestOptions.body instanceof FormData) {
    delete (headers as any)['Content-Type'];
  }

  // Timeout controller
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);

  try {
    if (loadingMessage) {
      notify({
        type: 'info',
        title: 'Cargando',
        message: loadingMessage,
        duration: 0,
        category: 'api'
      });
    }

    const response = await withRetry(async () => {
      return fetch(`${getApiBase()}${endpoint}`, {
        ...requestOptions,
        headers: {
          ...headers,
          ...requestOptions.headers
        },
        signal: controller.signal
      });
    });

    clearTimeout(timeoutId);

    let data;
    const contentType = response.headers.get('content-type');
    
    try {
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }
    } catch (e) {
      data = null;
    }

    if (!response.ok) {
      // Si es 401, intentar refrescar token y reintentar una vez
      if (response.status === 401) {
        // Logging temporal para debugging
        let bodyText = null;
        try { 
          bodyText = await response.clone().text(); 
        } catch(e) {
          bodyText = 'No se pudo leer body';
        }
        console.debug('[API][401] url=', `${getApiBase()}${endpoint}`, 'body=', bodyText, 'headers=', Object.fromEntries(response.headers.entries()));

        try {
          console.debug('[API] 401 recibido, intentando refresh token automático');
          let refreshed = await (apiService as any).tryRefreshAuth();
          if (!refreshed) {
            console.debug('[API] Refresh no disponible o falló, intentando login automático vía AuthManager');
            try {
              const authModule = await import('./authManager');
              const authManager = authModule.authManager || authModule.default;
              if (authManager && typeof authManager.ensureAuthenticated === 'function') {
                const ok = await authManager.ensureAuthenticated();
                console.debug('[API] authManager.ensureAuthenticated result:', ok);
                if (ok) {
                  refreshed = true; // mark as refreshed so we retry
                } else {
                  console.debug('[API] authManager no pudo re-autenticar');
                }
              }
            } catch (e) {
              console.warn('[API] error calling authManager.ensureAuthenticated', e);
            }
          }

          if (refreshed) { // solo reintentar si realmente se refrescó o authManager re-autenticó
            // reconstruir headers con nuevo token
            const retryHeaders: HeadersInit = getHeaders();
            if (requestOptions.body instanceof FormData) {
              delete (retryHeaders as any)['Content-Type'];
            }

            const retryResponse = await fetch(`${getApiBase()}${endpoint}`, {
              ...requestOptions,
              headers: {
                ...retryHeaders,
                ...requestOptions.headers
              },
              signal: controller.signal
            });

            let retryData: any = null;
            const retryContentType = retryResponse.headers.get('content-type');
            try {
              if (retryContentType && retryContentType.includes('application/json')) {
                retryData = await retryResponse.json();
              } else {
                retryData = await retryResponse.text();
              }
            } catch (e) {
              retryData = null;
            }

            if (!retryResponse.ok) {
              const error = handleApiError(retryResponse, retryData);
              if (showErrorNotification && retryResponse.status !== 404) {
                notify({ type: 'error', title: `Error ${retryResponse.status}`, message: error.message, category: 'api' });
              }
              throw error;
            }

            // Guardar en cache si corresponde (igual que abajo)
            if (cache && (requestOptions.method === 'GET' || !requestOptions.method)) {
              apiCache.set(cacheKey, retryData, cacheTtl);
            }

            if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(requestOptions.method || '')) {
              apiCache.invalidate(endpoint.split('/')[1]);
            }

            if (showSuccessNotification && ['POST', 'PUT', 'DELETE'].includes(requestOptions.method || '')) {
              const operationMessages = {
                POST: 'Creado exitosamente',
                PUT: 'Actualizado exitosamente',
                DELETE: 'Eliminado exitosamente'
              };
              notify({ type: 'success', title: 'Éxito', message: operationMessages[requestOptions.method as keyof typeof operationMessages] || 'Operación completada', category: 'api' });
            }

            return retryData;
          }
        } catch (e) {
          // ignore and fallthrough to handleApiError
        }
      }

      const error = handleApiError(response, data);
      if (showErrorNotification && response.status !== 404) {
        notify({ type: 'error', title: `Error ${response.status}`, message: error.message, category: 'api' });
      }
      throw error;
    }

    // Guardar en cache si corresponde
    if (cache && (requestOptions.method === 'GET' || !requestOptions.method)) {
      apiCache.set(cacheKey, data, cacheTtl);
    }

    // Invalidar cache en operaciones de escritura
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(requestOptions.method || '')) {
      apiCache.invalidate(endpoint.split('/')[1]); // Invalidar por recurso
    }

    if (showSuccessNotification && ['POST', 'PUT', 'DELETE'].includes(requestOptions.method || '')) {
      const operationMessages = {
        POST: 'Creado exitosamente',
        PUT: 'Actualizado exitosamente',
        DELETE: 'Eliminado exitosamente'
      };
      
      notify({
        type: 'success',
        title: 'Éxito',
        message: operationMessages[requestOptions.method as keyof typeof operationMessages] || 'Operación completada',
        category: 'api'
      });
    }

    return data;

  } catch (error: any) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      const timeoutError = new Error('La solicitud tardó demasiado tiempo. Intente nuevamente.');
      
      if (showErrorNotification) {
        notify({
          type: 'error',
          title: 'Timeout',
          message: timeoutError.message,
          category: 'api'
        });
      }
      
      throw timeoutError;
    }
    
    throw error;
  }
};

// Manejo mejorado de errores de API
const handleApiError = (response: Response, data: any): Error => {
  if (response.status === 401) {
    // En lugar de redirigir inmediatamente, limpiar el token y lanzar error
    // El authManager se encargará de la re-autenticación automática
    localStorage.removeItem('authToken');
    authToken = null;
  // No notificar aquí para evitar duplicar mensajes.
  // La función que invocó apiRequest decidirá si mostrar notificación
  // (controlada por el flag showErrorNotification).
  // Limpiar token y devolver error para que el caller lo procese.
  // Incluir una pista para el usuario sobre pasos a seguir.
  return new Error('Token de autenticación inválido o expirado');
  }

  if (response.status === 403) {
    return new Error('No tiene permisos para realizar esta acción.');
  }

  if (response.status === 404) {
  // Añadir sugerencia útil para troubleshooting (p. ej. URL del servidor)
  return new Error('El recurso solicitado no fue encontrado. Verifica la URL del servidor en Ajustes o que el backend esté corriendo.');
  }

  if (response.status === 422) {
    if (data && data.errors) {
      const errorMessages = data.errors.map((err: any) => 
        `${err.field}: ${err.message}`
      ).join('\n');
      return new Error(`Errores de validación:\n${errorMessages}`);
    }
    return new Error('Datos inválidos. Verifique la información ingresada.');
  }

  if (response.status === 429) {
    // Extraer información de rate limiting
    const retryAfter = response.headers.get('Retry-After') || 
                      (data && data.retryAfter) || 
                      60; // Default 60 segundos
    
    const error = new Error(
      data && data.message ? 
      data.message : 
      `Demasiadas solicitudes. Intente nuevamente en ${retryAfter} segundos.`
    );
    
    // Agregar propiedades adicionales al error
    (error as any).status = 429;
    (error as any).retryAfter = parseInt(retryAfter.toString());
    
    return error;
  }

  if (response.status >= 500) {
    return new Error('Error interno del servidor. Intente nuevamente más tarde.');
  }

  // Mostrar mensaje de error del backend si existe
  if (data && (data.error || data.message)) {
    const details = data.details ? `\n${data.details.map((d: any) => d.message).join('\n')}` : '';
    return new Error(`${data.error || data.message}${details}`);
  }

  return new Error(`Error ${response.status}: ${response.statusText}`);
};

// API Services mejorados
export const apiService = {
  /**
   * Configuración y utilidades
   */
  getApiUrl: () => getApiBase(),
  
  // Obtener URL base para archivos estáticos (sin /api)
  getBaseUrl: () => {
    return import.meta.env.DEV 
      ? window.location.origin  // En desarrollo: http://localhost:8080 (con proxy)
      : 'http://localhost:3002'; // En producción: servidor backend directo
  },
  
  cache: {
    clear: () => apiCache.invalidate(),
    invalidate: (pattern: string) => apiCache.invalidate(pattern)
  },

  // Intentar refrescar la sesión usando refresh token (usa fetch directo para evitar recursión)
  tryRefreshAuth: async (): Promise<boolean> => {
    if (!refreshTokenStored) return false;
    try {
      console.debug('[AUTH] Intentando refresh desde cliente');
  const resp = await fetch(`${getApiBase()}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: refreshTokenStored })
      });

      let data: any = null;
      try {
        data = await resp.json();
      } catch (e) {
        data = null;
      }

      if (!resp.ok) {
        console.warn('[AUTH] Refresh failed', resp.status, data);
        // limpiar refresh token si inválido
        refreshTokenStored = null;
        localStorage.removeItem('refreshToken');
        return false;
      }

      if (data && data.token) {
        authToken = data.token;
        localStorage.setItem('authToken', data.token);
        if (data.refreshToken) {
          refreshTokenStored = data.refreshToken;
          localStorage.setItem('refreshToken', data.refreshToken);
        }
        console.debug('[AUTH] Refresh success, token updated');
        return true;
      }

      // Si no trae token, limpiar todo
      refreshTokenStored = null;
      localStorage.removeItem('refreshToken');
      return false;
    } catch (err) {
      console.error('[AUTH] tryRefreshAuth error', err);
      refreshTokenStored = null;
      localStorage.removeItem('refreshToken');
      return false;
    }
  },

  // Productos mejorados
  products: {
    /**
     * Obtener todos los productos con cache y filtros
     */
    getAll: async (params: {
      page?: number;
      limit?: number;
      search?: string;
      category?: string;
      categoryId?: string;
      brand?: string;
      status?: string;
      filters?: Record<string, string>;
    } = {}) => {
      const queryString = new URLSearchParams(
        Object.entries({ ...params, ...params.filters })
          .filter(([_, value]) => value !== undefined && value !== '')
          .map(([key, value]) => [key, String(value)])
      ).toString();
      
      return apiRequest(`/products${queryString ? `?${queryString}` : ''}`, {
        cache: true,
        cacheTtl: 2 * 60 * 1000, // 2 minutos
        loadingMessage: 'Cargando productos...'
      });
    },

    /**
     * Obtener producto por ID con cache
     */
    getById: async (id: string) => {
      return apiRequest(`/products/${id}`, {
        cache: true,
        cacheTtl: 5 * 60 * 1000,
        showErrorNotification: true
      });
    },

    /**
     * Crear producto con notificaciones mejoradas
     */
    create: async (productData: FormData) => {
      return apiRequest('/products', {
        method: 'POST',
        body: productData,
        showSuccessNotification: true,
        loadingMessage: 'Creando producto...'
      });
    },

    /**
     * Actualizar producto con notificaciones mejoradas
     */
    update: async (id: string, productData: FormData) => {
      return apiRequest(`/products/${id}`, {
        method: 'PUT',
        body: productData,
        showSuccessNotification: true,
        loadingMessage: 'Actualizando producto...'
      });
    },

    /**
     * Eliminar producto
     */
    delete: async (id: string) => {
      return apiRequest(`/products/${id}`, {
        method: 'DELETE',
        showSuccessNotification: true,
        loadingMessage: 'Eliminando producto...'
      });
    },

    /**
     * Búsqueda avanzada de productos
     */
    search: async (query: string, filters: Record<string, any> = {}) => {
      return apiRequest('/products/search', {
        method: 'POST',
        body: JSON.stringify({ query, filters }),
        cache: true,
        cacheTtl: 1 * 60 * 1000 // 1 minuto
      });
    },

    /**
     * Obtener estadísticas de productos
     */
    getStats: async () => {
      return apiRequest('/products/stats', {
        cache: true,
        cacheTtl: 10 * 60 * 1000 // 10 minutos
      });
    },

    /**
     * Validar SKU único
     */
    validateSku: async (sku: string, excludeId?: string) => {
      const params = new URLSearchParams({ sku });
      if (excludeId) params.append('excludeId', excludeId);
      
      return apiRequest(`/products/validate-sku?${params.toString()}`, {
        cache: true,
        cacheTtl: 30 * 1000 // 30 segundos
      });
    },

    /**
     * Obtener sugerencias de búsqueda
     */
    getSuggestions: async (query: string) => {
      if (!query || query.length < 2) {
        return { suggestions: [] };
      }
      
      return apiRequest(`/products/suggestions?q=${encodeURIComponent(query)}`, {
        cache: true,
        cacheTtl: 1 * 60 * 1000 // 1 minuto
      });
    }
  },

  /**
   * Gestión de atributos
   */
  attributes: {
    /**
     * Crear atributo con validación mejorada
     */
    create: async (attributeData: {
      categoryId: string;
      name: string;
      type: string;
      isRequired: boolean;
      values?: string[];
      unit?: string;
      helpText?: string;
      isGlobal?: boolean;
      dependsOn?: string;
      minValue?: number;
      maxValue?: number;
      regex?: string;
      description?: string;
    }) => {
      return apiRequest('/attributes', {
        method: 'POST',
        body: JSON.stringify(attributeData),
        showSuccessNotification: true,
        loadingMessage: 'Creando atributo...'
      });
    },

    /**
     * Obtener todos los atributos con cache
     */
    getAllAttributes: async () => {
      return apiRequest('/attributes', {
        cache: true,
        cacheTtl: 5 * 60 * 1000
      });
    },

    /**
     * Obtener atributos por categoría con cache
     */
    getAttributesByCategory: async (categoryId: string) => {
      return apiRequest(`/attributes?categoryId=${categoryId}`, {
        cache: true,
        cacheTtl: 5 * 60 * 1000
      });
    },

    /**
     * Actualizar atributo
     */
    update: async (attributeId: string, attributeData: any) => {
      return apiRequest(`/attributes/${attributeId}`, {
        method: 'PUT',
        body: JSON.stringify(attributeData),
        showSuccessNotification: true,
        loadingMessage: 'Actualizando atributo...'
      });
    },

    /**
     * Eliminar atributo
     */
    delete: async (attributeId: string) => {
      return apiRequest(`/attributes/${attributeId}`, {
        method: 'DELETE',
        showSuccessNotification: true,
        loadingMessage: 'Eliminando atributo...'
      });
    },

    /**
     * Asignar atributo a categoría
     */
    assignToCategory: async (attributeId: string, categoryId: string) => {
      return apiRequest(`/attributes/${attributeId}/categories`, {
        method: 'POST',
        body: JSON.stringify({ categoryIds: [categoryId] }),
        showSuccessNotification: true
      });
    }
  },

  /**
   * Gestión de atributos de categorías mejorada
   */
  categoryAttributes: {
    /**
     * Obtiene los atributos asignados a una categoría con cache
     */
    getByCategory: async (categoryId: string) => {
      return apiRequest(`/attributes/category/${categoryId}`, {
        cache: true,
        cacheTtl: 5 * 60 * 1000
      });
    },

    /**
     * Obtiene todos los atributos disponibles
     */
    getAllAttributes: async () => {
      return apiRequest(`/attributes`, {
        cache: true,
        cacheTtl: 5 * 60 * 1000
      });
    },

    /**
     * Asigna un atributo a una categoría
     */
    assign: async (categoryId: string, attributeId: string, isRequired: boolean, order: number) => {
      return apiRequest(`/attributes/${attributeId}/categories`, {
        method: 'POST',
        body: JSON.stringify({ categoryIds: [categoryId], isRequired, order }),
        showSuccessNotification: true
      });
    },

    /**
     * Desasigna un atributo de una categoría
     */
    unassign: async (categoryId: string, attributeId: string) => {
      return apiRequest(`/attributes/${attributeId}/categories/${categoryId}`, {
        method: 'DELETE',
        showSuccessNotification: true
      });
    },

    /**
     * Guarda en bloque todas las asignaciones de atributos de una categoría
     */
    saveAll: async (categoryId: string, assignments: { attributeId: string, isRequired: boolean, order: number }[]) => {
      return apiRequest(`/attributes/category/${categoryId}/assignments`, {
        method: 'PUT',
        body: JSON.stringify({ assignments }),
        showSuccessNotification: true,
        loadingMessage: 'Guardando asignaciones...'
      });
    }
  },

  // Categorías mejoradas
  categories: {
    /**
     * Obtener todas las categorías con cache
     */
    getAll: async () => {
      return apiRequest('/categories', {
        cache: true,
        cacheTtl: 10 * 60 * 1000, // 10 minutos
        loadingMessage: 'Cargando categorías...'
      });
    },

    /**
     * Obtener categoría por ID
     */
    getById: async (id: string) => {
      return apiRequest(`/categories/${id}`, {
        cache: true,
        cacheTtl: 5 * 60 * 1000
      });
    },

    /**
     * Crear categoría
     */
    create: async (categoryData: any) => {
      return apiRequest('/categories', {
        method: 'POST',
        body: JSON.stringify(categoryData),
        showSuccessNotification: true,
        loadingMessage: 'Creando categoría...'
      });
    },

    /**
     * Actualizar categoría
     */
    update: async (id: string, categoryData: any) => {
      return apiRequest(`/categories/${id}`, {
        method: 'PUT',
        body: JSON.stringify(categoryData),
        showSuccessNotification: true,
        loadingMessage: 'Actualizando categoría...'
      });
    },

    /**
     * Crear subcategoría
     */
    createSubcategory: async (subcategoryData: any) => {
      return apiRequest('/categories/subcategory', {
        method: 'POST',
        body: JSON.stringify(subcategoryData),
        showSuccessNotification: true,
        loadingMessage: 'Creando subcategoría...'
      });
    },

    /**
     * Eliminar categoría
     */
    delete: async (id: string) => {
      return apiRequest(`/categories/${id}`, {
        method: 'DELETE',
        showSuccessNotification: true,
        loadingMessage: 'Eliminando categoría...'
      });
    }
  },

  // Marcas mejoradas
  brands: {
    /**
     * Obtener todas las marcas con cache
     */
    getAll: async () => {
      return apiRequest('/brands', {
        cache: true,
        cacheTtl: 10 * 60 * 1000
      });
    },

    /**
     * Crear marca
     */
    create: async (brandData: any) => {
      return apiRequest('/brands', {
        method: 'POST',
        body: JSON.stringify(brandData),
        showSuccessNotification: true,
        loadingMessage: 'Creando marca...'
      });
    },

    /**
     * Actualizar marca
     */
    update: async (id: string, brandData: any) => {
      return apiRequest(`/brands/${id}`, {
        method: 'PUT',
        body: JSON.stringify(brandData),
        showSuccessNotification: true
      });
    },

    /**
     * Eliminar marca
     */
    delete: async (id: string) => {
      return apiRequest(`/brands/${id}`, {
        method: 'DELETE',
        showSuccessNotification: true,
        loadingMessage: 'Eliminando marca...'
      });
    }
  },

  // Clientes mejorados
  customers: {
    /**
     * Obtener todos los clientes
     */
    getAll: async (params: {
      page?: number;
      limit?: number;
      search?: string;
      status?: string;
    } = {}) => {
      const queryString = new URLSearchParams(
        Object.entries(params)
          .filter(([_, value]) => value !== undefined && value !== '')
          .map(([key, value]) => [key, String(value)])
      ).toString();
      
      return apiRequest(`/test-customers${queryString ? `?${queryString}` : ''}`, {
        cache: true,
        cacheTtl: 2 * 60 * 1000,
        loadingMessage: 'Cargando clientes...',
        showErrorNotification: false // evitar popup 404 al listar
      });
    },

    /**
     * Buscar clientes por nombre, documento o teléfono
     */
    search: async (query: string) => {
      if (!query || query.length < 2) {
        return { customers: [] };
      }
      
      return apiRequest(`/customers?search=${encodeURIComponent(query)}&limit=10`, {
        cache: true,
        cacheTtl: 1 * 60 * 1000 // 1 minuto
      });
    },

    /**
     * Crear cliente
     */
    create: async (customerData: any) => {
      return apiRequest('/customers', {
        method: 'POST',
        body: JSON.stringify(customerData),
        showSuccessNotification: true,
        loadingMessage: 'Creando cliente...'
      });
    },

    /**
     * Actualizar cliente
     */
    update: async (id: string, customerData: any) => {
      return apiRequest(`/customers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(customerData),
        showSuccessNotification: true
      });
    },

    /**
     * Eliminar cliente
     */
    delete: async (id: string) => {
      return apiRequest(`/customers/${id}`, {
        method: 'DELETE',
        showSuccessNotification: true
      });
    }
    ,
    import: async (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      return apiRequest('/customers/import', {
        method: 'POST',
        body: fd,
        showSuccessNotification: true,
        loadingMessage: 'Importando clientes...'
      });
    },
    export: async () => {
      const base = getApiBase();
      const resp = await fetch(`${base}/customers/export`, {
        headers: {
          ...(localStorage.getItem('authToken') ? { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` } : {})
        }
      });
      if (!resp.ok) throw new Error('Error al exportar clientes');
      const blob = await resp.blob();
      return blob;
    }
  },

  // Autenticación
  auth: {
    /**
     * Login de usuario
     */
    login: async (identifier: string, password: string) => {
      const base = getApiBase();
      const response = await fetch(`${base}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ identifier, password })
      });

      if (!response.ok) {
        throw new Error('Error en el login');
      }

      const data = await response.json();
      
      // Guardar tokens
      if (data.token) {
        localStorage.setItem('authToken', data.token);
        authToken = data.token;
      }
      if (data.refreshToken) {
        localStorage.setItem('refreshToken', data.refreshToken);
        refreshTokenStored = data.refreshToken;
      }

      return data;
    },

    /**
     * Login automático con credenciales de desarrollo
     */
    autoLogin: async () => {
      try {
        // Intentar login con credenciales de desarrollo
        return await apiService.auth.login('admin@bikeshop.com', 'DevAdmin@2025!');
      } catch (error) {
        console.warn('Auto-login falló:', error);
        throw error;
      }
    },

    /**
     * Logout de usuario
     */
    logout: () => {
      authToken = null;
      localStorage.removeItem('authToken');
      refreshTokenStored = null;
      localStorage.removeItem('refreshToken');
      apiCache.clear();
      
      notify({
        type: 'info',
        title: 'Sesión cerrada',
        message: 'Has cerrado sesión correctamente',
        category: 'api'
      });
    },

    /**
     * Verificar token de autenticación
     */
    verify: async () => {
      return apiRequest('/auth/verify', {
        cache: true,
        cacheTtl: 5 * 60 * 1000 // 5 minutos
      });
    }
  },

  // Ventas
  sales: {
    /**
     * Crear una nueva venta
     */
    create: async (saleData: any) => {
      return apiRequest('/sales', {
        method: 'POST',
        body: JSON.stringify(saleData),
        showSuccessNotification: true
      });
    },

    /**
     * Obtener ventas recientes
     */
    getRecent: async (limit: number = 10) => {
      return apiRequest(`/sales/recent?limit=${limit}`, {
        cache: true,
        cacheTtl: 2 * 60 * 1000
      });
    },

    /**
     * Obtener todas las ventas con filtros
     */
    getAll: async (params?: {
      page?: number;
      limit?: number;
      startDate?: string;
      endDate?: string;
      customerId?: string;
      status?: string;
    }) => {
      const queryParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            queryParams.append(key, value.toString());
          }
        });
      }
      const queryString = queryParams.toString();
      return apiRequest(`/sales${queryString ? `?${queryString}` : ''}`, {
        cache: true,
        cacheTtl: 5 * 60 * 1000
      });
    },

    /**
     * Obtener venta por ID
     */
    getById: async (id: string) => {
      return apiRequest(`/sales/${id}`);
    },

    /**
     * Actualizar estado de venta
     */
    updateStatus: async (id: string, status: string) => {
      return apiRequest(`/sales/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
        showSuccessNotification: true
      });
    },

    /**
     * Obtener estadísticas de ventas
     */
    getStats: async (period: string = '30d') => {
      return apiRequest(`/sales/stats?period=${period}`, {
        cache: true,
        cacheTtl: 10 * 60 * 1000
      });
    }
  },

  // Dashboard mejorado
  dashboard: {
    /**
     * Obtener estadísticas del dashboard con cache
     */
    getStats: async () => {
      return apiRequest('/dashboard/stats', {
        cache: true,
        cacheTtl: 5 * 60 * 1000,
        loadingMessage: 'Cargando estadísticas...'
      });
    },

    /**
     * Obtener gráficos de ventas
     */
    getSalesCharts: async (period: string = '30d') => {
      return apiRequest(`/dashboard/sales-charts?period=${period}`, {
        cache: true,
        cacheTtl: 10 * 60 * 1000
      });
    },

    /**
     * Obtener alertas del sistema
     */
    getAlerts: async () => {
      return apiRequest('/dashboard/alerts', {
        cache: true,
        cacheTtl: 1 * 60 * 1000
      });
    }
  },

  // Inventario
  inventory: {
    /**
     * Obtener filtros disponibles para inventario
     */
    getFilters: async (categoryId?: string) => {
      const params = categoryId ? `?categoryId=${categoryId}` : '';
      return apiRequest(`/inventory/filters${params}`, {
        cache: true,
        cacheTtl: 5 * 60 * 1000
      });
    },

    /**
     * Obtener alertas de stock
     */
    getStockAlerts: async () => {
      return apiRequest('/inventory/stock-alerts', {
        cache: true,
        cacheTtl: 2 * 60 * 1000
      });
    },

    /**
     * Actualizar stock de producto
     */
    updateStock: async (productId: string, quantity: number, reason?: string) => {
      return apiRequest(`/inventory/products/${productId}/stock`, {
        method: 'PUT',
        body: JSON.stringify({ quantity, reason }),
        showSuccessNotification: true
      });
    }
  },

  // Créditos/Apartados
  credits: {
    /**
     * Obtener créditos de un cliente (temporal sin auth)
     */
    getByCustomer: async (customerId: string) => {
      console.log('🔧 API Credits - Getting credits for customer:', customerId);
      console.log('🔧 API Credits - Using endpoint: /test-credits/' + customerId);
      console.log('🔧 API Credits - Full URL:', getApiBase() + '/test-credits/' + customerId);

      return apiRequest(`/test-credits/${customerId}`, {
        cache: false, // Deshabilitar cache para debugging
        cacheTtl: 1 * 60 * 1000,
        loadingMessage: 'Cargando créditos...'
      });
    },

    /**
     * Obtener un crédito por ID
     */
    getById: async (id: string) => {
      return apiRequest(`/credits/${id}`, {
        cache: true,
        cacheTtl: 1 * 60 * 1000
      });
    },

    /**
     * Crear un crédito (temporal sin auth para desarrollo)
     */
    create: async (creditData: any) => {
      console.log('🔧 API Credits - Creating credit with data:', creditData);
      console.log('🔧 API Credits - Customer ID being sent:', creditData.customerId);
      console.log('🔧 API Credits - Using endpoint: /test-credits');

      return apiRequest('/test-credits', {
        method: 'POST',
        body: JSON.stringify(creditData),
        showSuccessNotification: true,
        loadingMessage: 'Creando crédito...'
      });
    },

    /**
     * Actualizar un crédito
     */
    update: async (id: string, creditData: any) => {
      return apiRequest(`/credits/${id}`, {
        method: 'PUT',
        body: JSON.stringify(creditData),
        showSuccessNotification: true
      });
    },

    /**
     * Eliminar un crédito
     */
    delete: async (id: string) => {
      return apiRequest(`/credits/${id}`, {
        method: 'DELETE',
        showSuccessNotification: true
      });
    },

    /**
     * Marcar crédito como pagado
     */
    markPaid: async (id: string) => {
      return apiRequest(`/credits/${id}/mark-paid`, {
        method: 'POST',
        showSuccessNotification: true
      });
    },

    /**
     * Agregar abono
     */
    addInstallment: async (creditId: string, installmentData: any) => {
      return apiRequest(`/credits/${creditId}/installments`, {
        method: 'POST',
        body: JSON.stringify(installmentData),
        showSuccessNotification: true,
        loadingMessage: 'Agregando abono...'
      });
    },

    /**
     * Editar abono
     */
    updateInstallment: async (id: string, installmentData: any) => {
      return apiRequest(`/credits/installments/${id}`, {
        method: 'PUT',
        body: JSON.stringify(installmentData),
        showSuccessNotification: true
      });
    },

    /**
     * Eliminar abono
     */
    deleteInstallment: async (id: string) => {
      return apiRequest(`/credits/installments/${id}`, {
        method: 'DELETE',
        showSuccessNotification: true
      });
    }
  }
};

// Hook personalizado para autenticación mejorado
export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(!!authToken);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  const login = async (identifier: string, password: string) => {
    setLoading(true);
    try {
      const data = await apiService.auth.login(identifier, password);
      setIsAuthenticated(true);
      setUser(data.user);
      return data;
    } catch (error) {
      setIsAuthenticated(false);
      setUser(null);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    apiService.auth.logout();
    setIsAuthenticated(false);
    setUser(null);
  };

  const verifyAuth = async () => {
    if (!authToken) return false;
    
    try {
      const data = await apiService.auth.verify();
      setUser(data.user);
      return true;
    } catch (error) {
      logout();
      return false;
    }
  };

  return {
    isAuthenticated,
    user,
    loading,
    login,
    logout,
    verifyAuth
  };
};
