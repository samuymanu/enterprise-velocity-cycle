// Demo de integración - FASE 4 completada
// Este archivo demuestra todas las funcionalidades implementadas

import React, { useEffect } from 'react';
import { useNotify } from '@/stores/notificationStore';
import { useInventoryStore } from '@/stores/inventoryStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  AlertCircle, 
  Zap, 
  Database, 
  Bell, 
  Cpu,
  Activity,
  TrendingUp 
} from 'lucide-react';

export const Fase4Demo: React.FC = () => {
  const notify = useNotify();
  const { 
    products, 
    categories, 
    brands, 
    loading,
    stats
  } = useInventoryStore();

  // Simular carga inicial
  useEffect(() => {
    const demo = async () => {
      // Simular notificación de inicio de sistema
      notify.info(
        'Sistema Iniciado',
        'Fase 4: Integración y Comunicación activada',
        { category: 'system' }
      );

      // Simular carga de datos
      setTimeout(() => {
        notify.success(
          'Datos Sincronizados',
          'Inventario actualizado correctamente',
          { category: 'inventory' }
        );
      }, 2000);
    };

    demo();
  }, [notify]);

  const features = [
    {
      title: '🚀 API Service Mejorado',
      description: 'Cache, reintentos, timeout y notificaciones automáticas',
      status: 'active',
      icon: <Zap className="h-6 w-6 text-blue-500" />,
      details: [
        'Cache inteligente con TTL',
        'Reintentos automáticos',
        'Manejo de timeouts',
        'Notificaciones contextuales'
      ]
    },
    {
      title: '📊 Estado Global (Zustand)',
      description: 'Gestión centralizada del inventario con persistencia',
      status: 'active',
      icon: <Database className="h-6 w-6 text-green-500" />,
      details: [
        'CRUD completo de inventario',
        'Filtros dinámicos',
        'Paginación avanzada',
        'Estadísticas automáticas'
      ]
    },
    {
      title: '🔔 Sistema de Notificaciones',
      description: 'Centro unificado con toasts y notificaciones persistentes',
      status: 'active',
      icon: <Bell className="h-6 w-6 text-purple-500" />,
      details: [
        'Centro de notificaciones',
        'Toasts temporales',
        'Categorización inteligente',
        'Sonidos configurables'
      ]
    },
    {
      title: '⚡ Optimizaciones',
      description: 'Rendimiento y experiencia de usuario mejorados',
      status: 'active',
      icon: <Activity className="h-6 w-6 text-orange-500" />,
      details: [
        'Cache de requests',
        'Updates optimistas',
        'Error recovery automático',
        'Estados de carga mejorados'
      ]
    }
  ];

  const testActions = [
    {
      label: 'Test Notificación de Éxito',
      action: () => notify.success(
        'Operación Exitosa',
        'Producto guardado en el inventario',
        { category: 'inventory' }
      ),
      color: 'bg-green-50 border-green-200'
    },
    {
      label: 'Test Error de API',
      action: () => notify.error(
        'Error de Conexión',
        'No se pudo conectar con el servidor',
        { 
          category: 'api',
          action: {
            label: 'Reintentar',
            onClick: () => notify.info('Reintentando...', 'Conectando al servidor')
          }
        }
      ),
      color: 'bg-red-50 border-red-200'
    },
    {
      label: 'Test Stock Bajo',
      action: () => notify.warning(
        'Stock Crítico',
        'La bicicleta MTB tiene solo 2 unidades',
        { category: 'inventory' }
      ),
      color: 'bg-yellow-50 border-yellow-200'
    },
    {
      label: 'Test Sistema',
      action: () => notify.info(
        'Backup Programado',
        'Iniciando copia de seguridad automática',
        { 
          category: 'system',
          duration: 0 // Persistente
        }
      ),
      color: 'bg-blue-50 border-blue-200'
    }
  ];

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center space-x-3 mb-4">
          <CheckCircle className="h-8 w-8 text-green-500" />
          <h1 className="text-3xl font-bold text-gray-900">
            FASE 4: INTEGRACIÓN Y COMUNICACIÓN
          </h1>
        </div>
        <Badge variant="outline" className="mb-4">
          ✅ COMPLETADA
        </Badge>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Sistema robusto de integración con API mejorado, estado global centralizado 
          y notificaciones unificadas para una experiencia de usuario excepcional.
        </p>
      </div>

      {/* Características Implementadas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {features.map((feature, index) => (
          <Card key={index} className="h-full">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {feature.icon}
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </div>
                <Badge variant="outline" className="text-green-600 border-green-300">
                  Activo
                </Badge>
              </div>
              <CardDescription>{feature.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1">
                {feature.details.map((detail, idx) => (
                  <li key={idx} className="flex items-center space-x-2 text-sm">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Estadísticas del Sistema */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Estado del Sistema</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{products.length}</div>
              <div className="text-sm text-gray-600">Productos en Store</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{categories.length}</div>
              <div className="text-sm text-gray-600">Categorías</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{brands.length}</div>
              <div className="text-sm text-gray-600">Marcas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {loading.products ? 'Cargando...' : 'Listo'}
              </div>
              <div className="text-sm text-gray-600">Estado API</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tests de Notificaciones */}
      <Card>
        <CardHeader>
          <CardTitle>🧪 Test del Sistema de Notificaciones</CardTitle>
          <CardDescription>
            Prueba las diferentes tipos de notificaciones integradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {testActions.map((test, index) => (
              <div key={index} className={`p-4 rounded-lg border ${test.color}`}>
                <Button 
                  onClick={test.action}
                  variant="outline"
                  className="w-full"
                >
                  {test.label}
                </Button>
              </div>
            ))}
          </div>
          
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium mb-2 flex items-center space-x-2">
              <Cpu className="h-4 w-4" />
              <span>Integración Automática</span>
            </h4>
            <p className="text-sm text-gray-600">
              El sistema de notificaciones está conectado automáticamente con el API service. 
              Todas las operaciones de red mostrarán notificaciones contextuales sin 
              configuración adicional en los componentes.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Próximos Pasos */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-800">🎯 Próximos Pasos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p>✅ <strong>API Service</strong> - Cache, reintentos, notificaciones</p>
            <p>✅ <strong>Estado Global</strong> - Zustand con persistencia</p>
            <p>✅ <strong>Notificaciones</strong> - Centro unificado y toasts</p>
            <p className="text-blue-700 font-medium mt-4">
              🚀 <strong>Fase 5:</strong> Funcionalidades Avanzadas (WebSockets, Analytics, PWA)
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Fase4Demo;
