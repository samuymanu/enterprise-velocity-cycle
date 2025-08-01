// API Service para conectar con el backend
const API_BASE_URL = 'http://localhost:3001/api';

// Storage para el token
let authToken: string | null = localStorage.getItem('authToken');

// Headers comunes
const getHeaders = () => ({
  'Content-Type': 'application/json',
  ...(authToken && { 'Authorization': `Bearer ${authToken}` })
});

// Función helper para requests
const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const headers: HeadersInit = getHeaders();

  // Si el body es FormData, el navegador establece el Content-Type automáticamente
  if (options.body instanceof FormData) {
    delete (headers as any)['Content-Type'];
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...headers,
      ...options.headers
    }
  });

  let data;
  try {
    data = await response.json();
  } catch (e) {
    data = null;
  }

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('authToken');
      authToken = null;
      throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.');
    }
    // Mostrar mensaje de error del backend si existe
    if (data && (data.error || data.message)) {
      const details = data.details ? `\n${data.details.map((d:any) => d.message).join('\n')}` : '';
      throw new Error(`${data.error || data.message}${details}`);
    }
    throw new Error(`Error ${response.status}: ${response.statusText}`);
  }

  return data;
};

// API Services
export const apiService = {
  getApiUrl: () => API_BASE_URL,

  // Autenticación
  auth: {
    login: async (identifier: string, password: string) => {
      const data = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier, password })
      });
      
      if (data.token) {
        authToken = data.token;
        localStorage.setItem('authToken', data.token);
      }
      
      return data;
    },

    logout: () => {
      authToken = null;
      localStorage.removeItem('authToken');
    },

    verify: async () => {
      return apiRequest('/auth/verify');
    }
  },

  // Productos
  products: {
    /**
     * Asigna un atributo existente a una categoría.
     * @param attributeId ID del atributo
     * @param categoryId ID de la categoría
     */
    assignAttributeToCategory: async (attributeId: string, categoryId: string) => {
      return apiRequest(`/attributes/${attributeId}/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryIds: [categoryId] })
      });
    },
    update: async (id: string, productData: FormData) => {
      return apiRequest(`/products/${id}`, {
        method: 'PUT',
        body: productData
      });
    },
    getAll: async (params: {
      page?: number;
      limit?: number;
      search?: string;
      category?: string;
      brand?: string;
      status?: string;
    } = {}) => {
      const queryString = new URLSearchParams(
        Object.entries(params)
          .filter(([_, value]) => value !== undefined)
          .map(([key, value]) => [key, String(value)])
      ).toString();
      
      return apiRequest(`/products${queryString ? `?${queryString}` : ''}`);
    },

    getById: async (id: string) => {
      return apiRequest(`/products/${id}`);
    },

    create: async (productData: FormData) => {
      return apiRequest('/products', {
        method: 'POST',
        body: productData
      });
    },

    createAttribute: async (attributeData: {
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(attributeData)
      });
    },

    getAttributesByCategory: async (categoryId: string) => {
      return apiRequest(`/attributes?categoryId=${categoryId}`);
    }
  },

  // Categorías
  categories: {
    getAll: async () => {
      return apiRequest('/categories');
    },

    create: async (categoryData: any) => {
      return apiRequest('/categories', {
        method: 'POST',
        body: JSON.stringify(categoryData)
      });
    },

    createSubcategory: async (subcategoryData: any) => {
      return apiRequest('/categories/subcategory', {
        method: 'POST',
        body: JSON.stringify(subcategoryData)
      });
    },

    delete: async (id: string) => {
      return apiRequest(`/categories/${id}`, {
        method: 'DELETE'
      });
    }
  },

  // Marcas
  brands: {
    getAll: async () => {
      return apiRequest('/brands');
    },

    create: async (brandData: any) => {
      return apiRequest('/brands', {
        method: 'POST',
        body: JSON.stringify(brandData)
      });
    },

    delete: async (id: string) => {
      return apiRequest(`/brands/${id}`, {
        method: 'DELETE'
      });
    }
  },

  // Clientes
  customers: {
    getAll: async () => {
      return apiRequest('/customers');
    },

    create: async (customerData: any) => {
      return apiRequest('/customers', {
        method: 'POST',
        body: JSON.stringify(customerData)
      });
    }
  },

  // Dashboard
  dashboard: {
    getStats: async () => {
      return apiRequest('/dashboard/stats');
    }
  }
};

// Hook personalizado para autenticación
export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(!!authToken);
  const [user, setUser] = useState(null);

  const login = async (identifier: string, password: string) => {
    try {
      const data = await apiService.auth.login(identifier, password);
      setIsAuthenticated(true);
      setUser(data.user);
      return data;
    } catch (error) {
      setIsAuthenticated(false);
      setUser(null);
      throw error;
    }
  };

  const logout = () => {
    apiService.auth.logout();
    setIsAuthenticated(false);
    setUser(null);
  };

  return {
    isAuthenticated,
    user,
    login,
    logout
  };
};

// React import (necesario para useState)
import { useState } from 'react';
