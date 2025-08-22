import { useState } from 'react';
import { useNotify } from '@/stores/notificationStore';
import { NotificationCenter, NotificationButton } from '@/components/ui/notification-center';
import { NotificationToasts } from '@/components/ui/notification-toasts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Bell, 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  AlertCircle,
  Play,
  Zap
} from 'lucide-react';

const TestNotifications = () => {
  const notify = useNotify();
  const [testCount, setTestCount] = useState(0);

  const testNotifications = [
    {
      type: 'success' as const,
      title: 'Producto agregado',
      message: 'El producto "Bicicleta Mountain Bike" se agregó correctamente al inventario.',
      category: 'inventory'
    },
    {
      type: 'warning' as const,
      title: 'Stock bajo',
      message: 'El producto "Casco de protección" tiene solo 2 unidades en stock.',
      category: 'inventory'
    },
    {
      type: 'error' as const,
      title: 'Error en API',
      message: 'No se pudo conectar con el servidor. Reintentando automáticamente.',
      category: 'api'
    },
    {
      type: 'info' as const,
      title: 'Actualización disponible',
      message: 'Hay una nueva versión del sistema disponible.',
      category: 'system'
    },
    {
      type: 'success' as const,
      title: 'Venta procesada',
      message: 'Venta #12345 por $150.00 procesada exitosamente.',
      category: 'user'
    }
  ];

  const triggerRandomNotification = () => {
    const randomNotification = testNotifications[Math.floor(Math.random() * testNotifications.length)];
    const count = testCount + 1;
    setTestCount(count);

    notify[randomNotification.type](
      `${randomNotification.title} #${count}`,
      randomNotification.message,
      {
        category: randomNotification.category,
        action: {
          label: 'Ver detalles',
          onClick: () => alert(`Acción ejecutada para notificación #${count}`)
        }
      }
    );
  };

  const triggerMultipleNotifications = () => {
    testNotifications.forEach((notification, index) => {
      setTimeout(() => {
        const count = testCount + index + 1;
        notify[notification.type](
          `${notification.title} #${count}`,
          notification.message,
          {
            category: notification.category,
            action: {
              label: 'Ver detalles',
              onClick: () => alert(`Acción ejecutada para notificación #${count}`)
            }
          }
        );
      }, index * 500); // Espaciar las notificaciones cada 500ms
    });
    setTestCount(prev => prev + testNotifications.length);
  };

  const simulateRateLimitError = () => {
    notify.error(
      'Rate Limit Alcanzado',
      'Demasiadas solicitudes al servidor. El próximo intento será en 60 segundos.',
      {
        category: 'api',
        action: {
          label: 'Reintentar',
          onClick: () => {
            notify.info('Reintentando...', 'Volviendo a intentar la conexión.', { category: 'api' });
          }
        }
      }
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Test de Notificaciones</h1>
            <p className="text-gray-600 mt-2">
              Prueba el sistema de notificaciones y manejo de rate limiting
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="secondary">Notificaciones: {testCount}</Badge>
            <NotificationButton />
          </div>
        </div>

        {/* Cards de prueba */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notificaciones Básicas
              </CardTitle>
              <CardDescription>
                Genera notificaciones individuales para probar el sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={triggerRandomNotification}
                className="w-full"
                variant="outline"
              >
                <Play className="h-4 w-4 mr-2" />
                Generar Notificación Aleatoria
              </Button>
              
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  size="sm"
                  variant="outline"
                  onClick={() => notify.success('Éxito', 'Operación completada correctamente', { category: 'user' })}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Éxito
                </Button>
                <Button 
                  size="sm"
                  variant="outline"
                  onClick={() => notify.error('Error', 'Algo salió mal', { category: 'api' })}
                >
                  <AlertCircle className="h-4 w-4 mr-1" />
                  Error
                </Button>
                <Button 
                  size="sm"
                  variant="outline"
                  onClick={() => notify.warning('Advertencia', 'Revisa esta situación', { category: 'system' })}
                >
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  Advertencia
                </Button>
                <Button 
                  size="sm"
                  variant="outline"
                  onClick={() => notify.info('Información', 'Datos importantes', { category: 'inventory' })}
                >
                  <Info className="h-4 w-4 mr-1" />
                  Info
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Pruebas Avanzadas
              </CardTitle>
              <CardDescription>
                Simula escenarios reales del sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={triggerMultipleNotifications}
                className="w-full"
                variant="default"
              >
                Generar Múltiples Notificaciones
              </Button>
              
              <Button 
                onClick={simulateRateLimitError}
                className="w-full"
                variant="destructive"
              >
                Simular Error de Rate Limit
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Información del sistema */}
        <Card>
          <CardHeader>
            <CardTitle>Estado del Sistema de Notificaciones</CardTitle>
            <CardDescription>
              El sistema está integrado con el store de Zustand y maneja automáticamente:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-2">Características:</h4>
                <ul className="text-sm space-y-1 text-gray-600">
                  <li>✅ Notificaciones persistentes y toasts temporales</li>
                  <li>✅ Categorización automática (API, Inventario, Usuario, Sistema)</li>
                  <li>✅ Centro de notificaciones con filtros</li>
                  <li>✅ Exportación de notificaciones</li>
                  <li>✅ Persistencia en localStorage</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Manejo de Rate Limiting:</h4>
                <ul className="text-sm space-y-1 text-gray-600">
                  <li>✅ Detección automática de errores 429</li>
                  <li>✅ Reintentos con backoff exponencial</li>
                  <li>✅ Prevención de loops infinitos</li>
                  <li>✅ Notificaciones informativas al usuario</li>
                  <li>✅ Manejo de headers Retry-After</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Componentes de notificación */}
      <NotificationCenter />
      <NotificationToasts />
    </div>
  );
};

export default TestNotifications;
