import React, { useEffect } from 'react';
import { useApiNotifications } from '@/stores/notificationStore';
import NotificationToasts from '@/components/ui/notification-toasts';
import NotificationCenter from '@/components/ui/notification-center';

// Provider que inicializa el sistema de notificaciones
export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Inicializar el handler de notificaciones de API
  useApiNotifications();

  // Configuración inicial y cleanup
  useEffect(() => {
    // Configuración de permisos de notificación del navegador (opcional)
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Cleanup de notificaciones antiguas al cargar
    const cleanupOldNotifications = () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      // Esto se podría implementar en el store si queremos limpieza automática
      console.log('Sistema de notificaciones inicializado');
    };

    cleanupOldNotifications();
  }, []);

  return (
    <>
      {children}
      {/* Componentes de notificaciones */}
      <NotificationToasts />
      <NotificationCenter />
    </>
  );
};

export default NotificationProvider;
