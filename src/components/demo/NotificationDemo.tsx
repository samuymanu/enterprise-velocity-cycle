// Ejemplo de integración del sistema de notificaciones
// Este archivo demuestra cómo usar el sistema de notificaciones en cualquier componente

import React from 'react';
import { useNotify } from '@/stores/notificationStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const NotificationDemo: React.FC = () => {
  const { success, error, warning, info, notify } = useNotify();

  const examples = [
    {
      title: 'Notificación de Éxito',
      description: 'Para operaciones completadas exitosamente',
      action: () => success(
        'Producto Guardado', 
        'El producto se ha guardado correctamente en el inventario',
        { category: 'inventory' }
      ),
      color: 'bg-green-50 border-green-200'
    },
    {
      title: 'Notificación de Error',
      description: 'Para errores que requieren atención',
      action: () => error(
        'Error de Conexión', 
        'No se pudo conectar con el servidor. Verifique su conexión.',
        { 
          category: 'api',
          action: {
            label: 'Reintentar',
            onClick: () => console.log('Reintentando...')
          }
        }
      ),
      color: 'bg-red-50 border-red-200'
    },
    {
      title: 'Notificación de Advertencia',
      description: 'Para situaciones que requieren precaución',
      action: () => warning(
        'Stock Bajo', 
        'El producto "Bicicleta MTB" tiene solo 3 unidades en stock',
        { category: 'inventory' }
      ),
      color: 'bg-yellow-50 border-yellow-200'
    },
    {
      title: 'Notificación de Información',
      description: 'Para información general del sistema',
      action: () => info(
        'Backup Completado', 
        'La copia de seguridad programada se completó exitosamente',
        { category: 'system' }
      ),
      color: 'bg-blue-50 border-blue-200'
    },
    {
      title: 'Notificación Personalizada',
      description: 'Con configuración avanzada',
      action: () => notify({
        type: 'success',
        title: 'Sincronización Completa',
        message: 'Se sincronizaron 47 productos con el sistema central',
        category: 'inventory',
        duration: 8000,
        action: {
          label: 'Ver Reporte',
          onClick: () => console.log('Abriendo reporte...')
        }
      }),
      color: 'bg-purple-50 border-purple-200'
    }
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Sistema de Notificaciones</h2>
        <p className="text-gray-600">
          Ejemplos de cómo usar las notificaciones en la aplicación
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {examples.map((example, index) => (
          <Card key={index} className={`cursor-pointer transition-all hover:shadow-md ${example.color}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">{example.title}</CardTitle>
              <CardDescription className="text-sm">
                {example.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={example.action}
                className="w-full"
                variant="outline"
              >
                Mostrar Notificación
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Integración con API</CardTitle>
          <CardDescription>
            Las notificaciones se conectan automáticamente con el sistema de API
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              El sistema de notificaciones está integrado con el servicio de API y mostrará 
              automáticamente notificaciones para:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Errores de conexión y timeouts</li>
              <li>Operaciones exitosas (crear, actualizar, eliminar)</li>
              <li>Errores de validación del servidor</li>
              <li>Estados de autenticación y autorización</li>
            </ul>
            
            <div className="mt-4">
              <h4 className="font-medium mb-2">Categorías disponibles:</h4>
              <div className="flex flex-wrap gap-2">
                {['api', 'inventory', 'user', 'system'].map(category => (
                  <span 
                    key={category}
                    className="px-2 py-1 bg-gray-100 rounded text-xs"
                  >
                    {category}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationDemo;
