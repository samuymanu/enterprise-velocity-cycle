import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

// Tipos para notificaciones
export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number; // en milisegundos, 0 = persistente
  action?: {
    label: string;
    onClick: () => void;
  };
  dismissible?: boolean;
  icon?: React.ReactNode;
  timestamp: Date;
  isRead?: boolean;
  category?: string;
}

export interface Toast extends Omit<Notification, 'isRead' | 'category'> {
  // Toasts son notificaciones temporales
}

interface NotificationState {
  // Notificaciones persistentes (para el centro de notificaciones)
  notifications: Notification[];
  
  // Toasts temporales
  toasts: Toast[];
  
  // Configuración
  maxNotifications: number;
  maxToasts: number;
  defaultDuration: number;
  
  // Estado
  unreadCount: number;
  isNotificationCenterOpen: boolean;
  
  // Configuración por categoría
  categorySettings: Record<string, {
    enabled: boolean;
    soundEnabled: boolean;
    duration: number;
  }>;
}

interface NotificationActions {
  // Acciones para notificaciones
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => string;
  removeNotification: (id: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  clearByCategory: (category: string) => void;
  
  // Acciones para toasts
  addToast: (toast: Omit<Toast, 'id' | 'timestamp'>) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
  
  // Acciones combinadas (agregar notificación y toast automáticamente)
  notify: (notification: Omit<Notification, 'id' | 'timestamp'> & { showToast?: boolean }) => string;
  
  // Métodos de conveniencia
  success: (title: string, message: string, options?: Partial<Notification>) => string;
  error: (title: string, message: string, options?: Partial<Notification>) => string;
  warning: (title: string, message: string, options?: Partial<Notification>) => string;
  info: (title: string, message: string, options?: Partial<Notification>) => string;
  
  // Configuración
  toggleNotificationCenter: () => void;
  setCategorySettings: (category: string, settings: Partial<NotificationState['categorySettings'][string]>) => void;
  setMaxNotifications: (max: number) => void;
  setMaxToasts: (max: number) => void;
  setDefaultDuration: (duration: number) => void;
  
  // Utilidades
  getNotificationsByCategory: (category: string) => Notification[];
  getUnreadNotifications: () => Notification[];
  exportNotifications: () => string;
  importNotifications: (data: string) => void;
}

// Generar ID único
const generateId = () => `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Estado inicial
const initialState: NotificationState = {
  notifications: [],
  toasts: [],
  maxNotifications: 50,
  maxToasts: 5,
  defaultDuration: 5000, // 5 segundos
  unreadCount: 0,
  isNotificationCenterOpen: false,
  categorySettings: {
    api: { enabled: true, soundEnabled: false, duration: 5000 },
    inventory: { enabled: true, soundEnabled: true, duration: 4000 },
    user: { enabled: true, soundEnabled: true, duration: 6000 },
    system: { enabled: true, soundEnabled: false, duration: 8000 }
  }
};

// Store de notificaciones
export const useNotificationStore = create<NotificationState & NotificationActions>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,
    
    // Implementación de acciones
    
    addNotification: (notification) => {
      const id = generateId();
      const newNotification: Notification = {
        ...notification,
        id,
        timestamp: new Date(),
        isRead: false,
        dismissible: notification.dismissible ?? true,
        duration: notification.duration ?? get().defaultDuration
      };
      
      set((state) => {
        const notifications = [newNotification, ...state.notifications]
          .slice(0, state.maxNotifications);
        
        return {
          notifications,
          unreadCount: notifications.filter(n => !n.isRead).length
        };
      });
      
      // Auto-remove si tiene duración y es dismissible
      if (newNotification.duration > 0 && newNotification.dismissible) {
        setTimeout(() => {
          get().removeNotification(id);
        }, newNotification.duration);
      }
      
      return id;
    },
    
    removeNotification: (id) => {
      set((state) => {
        const notifications = state.notifications.filter(n => n.id !== id);
        return {
          notifications,
          unreadCount: notifications.filter(n => !n.isRead).length
        };
      });
    },
    
    markAsRead: (id) => {
      set((state) => {
        const notifications = state.notifications.map(n =>
          n.id === id ? { ...n, isRead: true } : n
        );
        
        return {
          notifications,
          unreadCount: notifications.filter(n => !n.isRead).length
        };
      });
    },
    
    markAllAsRead: () => {
      set((state) => ({
        notifications: state.notifications.map(n => ({ ...n, isRead: true })),
        unreadCount: 0
      }));
    },
    
    clearNotifications: () => {
      set({
        notifications: [],
        unreadCount: 0
      });
    },
    
    clearByCategory: (category) => {
      set((state) => {
        const notifications = state.notifications.filter(n => n.category !== category);
        return {
          notifications,
          unreadCount: notifications.filter(n => !n.isRead).length
        };
      });
    },
    
    addToast: (toast) => {
      const id = generateId();
      const newToast: Toast = {
        ...toast,
        id,
        timestamp: new Date(),
        dismissible: toast.dismissible ?? true,
        duration: toast.duration ?? get().defaultDuration
      };
      
      set((state) => ({
        toasts: [newToast, ...state.toasts].slice(0, state.maxToasts)
      }));
      
      // Auto-remove toast
      if (newToast.duration > 0) {
        setTimeout(() => {
          get().removeToast(id);
        }, newToast.duration);
      }
      
      return id;
    },
    
    removeToast: (id) => {
      set((state) => ({
        toasts: state.toasts.filter(t => t.id !== id)
      }));
    },
    
    clearToasts: () => {
      set({ toasts: [] });
    },
    
    notify: (notification) => {
      const { showToast = true, ...notificationData } = notification;
      
      // Verificar configuración de categoría
      const categorySettings = get().categorySettings[notification.category || 'user'];
      if (categorySettings && !categorySettings.enabled) {
        return '';
      }
      
      // Agregar notificación persistente
      const notificationId = get().addNotification({
        ...notificationData,
        duration: categorySettings?.duration ?? notificationData.duration
      });
      
      // Agregar toast si está habilitado
      if (showToast) {
        get().addToast({
          ...notificationData,
          duration: categorySettings?.duration ?? notificationData.duration
        });
      }
      
      // Reproducir sonido si está habilitado
      if (categorySettings?.soundEnabled) {
        playNotificationSound(notification.type);
      }
      
      return notificationId;
    },
    
    // Métodos de conveniencia
    success: (title, message, options = {}) => {
      return get().notify({
        type: 'success',
        title,
        message,
        category: 'user',
        ...options
      });
    },
    
    error: (title, message, options = {}) => {
      return get().notify({
        type: 'error',
        title,
        message,
        category: 'user',
        duration: 8000, // Errores duran más tiempo
        ...options
      });
    },
    
    warning: (title, message, options = {}) => {
      return get().notify({
        type: 'warning',
        title,
        message,
        category: 'user',
        duration: 6000,
        ...options
      });
    },
    
    info: (title, message, options = {}) => {
      return get().notify({
        type: 'info',
        title,
        message,
        category: 'user',
        ...options
      });
    },
    
    // Configuración
    toggleNotificationCenter: () => {
      set((state) => ({
        isNotificationCenterOpen: !state.isNotificationCenterOpen
      }));
    },
    
    setCategorySettings: (category, settings) => {
      set((state) => ({
        categorySettings: {
          ...state.categorySettings,
          [category]: {
            ...state.categorySettings[category],
            ...settings
          }
        }
      }));
    },
    
    setMaxNotifications: (max) => {
      set({ maxNotifications: max });
    },
    
    setMaxToasts: (max) => {
      set({ maxToasts: max });
    },
    
    setDefaultDuration: (duration) => {
      set({ defaultDuration: duration });
    },
    
    // Utilidades
    getNotificationsByCategory: (category) => {
      return get().notifications.filter(n => n.category === category);
    },
    
    getUnreadNotifications: () => {
      return get().notifications.filter(n => !n.isRead);
    },
    
    exportNotifications: () => {
      const { notifications } = get();
      return JSON.stringify(notifications, null, 2);
    },
    
    importNotifications: (data) => {
      try {
        const notifications: Notification[] = JSON.parse(data);
        set((state) => ({
          notifications: [...notifications, ...state.notifications]
            .slice(0, state.maxNotifications),
          unreadCount: [...notifications, ...state.notifications]
            .filter(n => !n.isRead).length
        }));
      } catch (error) {
        console.error('Error importing notifications:', error);
      }
    }
  }))
);

// Función para reproducir sonidos de notificación
const playNotificationSound = (type: Notification['type']) => {
  // Implementación básica con Audio API
  if ('AudioContext' in window || 'webkitAudioContext' in window) {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Diferentes frecuencias para diferentes tipos
      const frequencies = {
        success: 800,
        info: 600,
        warning: 400,
        error: 300
      };
      
      oscillator.frequency.setValueAtTime(frequencies[type], audioContext.currentTime);
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.warn('Could not play notification sound:', error);
    }
  }
};

// Hooks de conveniencia
export const useNotifications = () => {
  const notifications = useNotificationStore(state => state.notifications);
  const unreadCount = useNotificationStore(state => state.unreadCount);
  const isOpen = useNotificationStore(state => state.isNotificationCenterOpen);
  const addNotification = useNotificationStore(state => state.addNotification);
  const markAsRead = useNotificationStore(state => state.markAsRead);
  const markAllAsRead = useNotificationStore(state => state.markAllAsRead);
  const removeNotification = useNotificationStore(state => state.removeNotification);
  const clearNotifications = useNotificationStore(state => state.clearNotifications);
  const toggleCenter = useNotificationStore(state => state.toggleNotificationCenter);
  const getByCategory = useNotificationStore(state => state.getNotificationsByCategory);
  const getUnread = useNotificationStore(state => state.getUnreadNotifications);
  const exportNotifications = useNotificationStore(state => state.exportNotifications);
  
  return {
    notifications,
    unreadCount,
    isOpen,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearNotifications,
    toggleCenter,
    getByCategory,
    getUnread,
    exportNotifications
  };
};

export const useToasts = () => {
  const toasts = useNotificationStore(state => state.toasts);
  const removeToast = useNotificationStore(state => state.removeToast);
  const clearToasts = useNotificationStore(state => state.clearToasts);
  
  return {
    toasts,
    removeToast,
    clearToasts
  };
};

export const useNotify = () => {
  const notify = useNotificationStore(state => state.notify);
  const success = useNotificationStore(state => state.success);
  const error = useNotificationStore(state => state.error);
  const warning = useNotificationStore(state => state.warning);
  const info = useNotificationStore(state => state.info);
  
  return {
    notify,
    success,
    error,
    warning,
    info
  };
};

// Hook para integración con API
export const useApiNotifications = () => {
  const notify = useNotificationStore(state => state.notify);
  
  // Configurar el handler para el API service
  React.useEffect(() => {
    import('@/lib/api').then(({ setNotificationHandler }) => {
      setNotificationHandler((notification) => {
        notify({
          ...notification,
          category: 'api',
          showToast: true
        });
      });
    });
  }, [notify]);
  
  return notify;
};

// Asegurarnos de que React esté disponible
import React from 'react';
