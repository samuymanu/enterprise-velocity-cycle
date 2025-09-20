import { Card } from '@/components/ui/card';
import { useEffect, useState } from 'react';
import { apiService } from '@/lib/api';

interface StatCardProps {
  title: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
  icon: string;
  description: string;
}

function StatCard({ title, value, change, changeType, icon, description }: StatCardProps) {
  const changeColor = {
    positive: 'text-success',
    negative: 'text-destructive',
    neutral: 'text-foreground-secondary'
  }[changeType];

  const handleCardClick = () => {
    // Funcionalidad básica para cada tipo de estadística
    switch (title) {
      case 'Ventas Totales':
        console.log('Navegar a módulo de ventas');
        // Aquí iría la navegación al módulo de ventas
        break;
      case 'Clientes Totales':
        console.log('Navegar a módulo de clientes');
        // Aquí iría la navegación al módulo de clientes
        break;
      case 'Apartados Activos':
        console.log('Navegar a módulo de apartados');
        // Aquí iría la navegación al módulo de apartados
        break;
      case 'Productos en Inventario':
        console.log('Navegar a módulo de inventario');
        // Aquí iría la navegación al módulo de inventario
        break;
      case 'Stock Crítico':
        console.log('Mostrar alertas de stock');
        // Aquí iría la lógica para mostrar alertas de stock
        break;
      case 'Servicios Activos':
        console.log('Navegar a módulo de servicios');
        // Aquí iría la navegación al módulo de servicios
        break;
      case 'Ventas de Hoy':
        console.log('Mostrar ventas del día');
        // Aquí iría la lógica para mostrar ventas del día
        break;
      case 'Producto Más Vendido':
        console.log('Mostrar detalles del producto');
        // Aquí iría la lógica para mostrar detalles del producto
        break;
      default:
        console.log(`Click en ${title}`);
    }
  };

  return (
    <Card 
      className="enterprise-card p-6 hover:shadow-enterprise-lg transition-all duration-300 cursor-pointer hover:scale-105"
      onClick={handleCardClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground-secondary">{title}</p>
          <p className="text-3xl font-bold text-foreground mt-2">{value}</p>
          <div className="flex items-center gap-1 mt-2">
            <span className={`text-sm font-medium ${changeColor}`}>
              {change}
            </span>
            <span className="text-xs text-foreground-secondary">vs mes anterior</span>
          </div>
          <p className="text-xs text-foreground-secondary mt-1">{description}</p>
        </div>
        <div className="text-2xl opacity-80">{icon}</div>
      </div>
    </Card>
  );
}

export function DashboardStats() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchStats = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);
      
      console.log('🔄 Fetching dashboard stats...');
      const dashboardStats = await apiService.dashboard.getStats();
      console.log('✅ Dashboard stats received:', dashboardStats);
      
      setStats(dashboardStats.stats || dashboardStats);
      setLastUpdate(new Date());
      setRetryCount(0); // Reset retry count on success
      
      console.log('📊 Stats set to state:', dashboardStats.stats || dashboardStats);
    } catch (error: any) {
      console.error('❌ Error fetching stats:', error);
      setError(error.message || 'Error al cargar estadísticas');
      setStats(null);

      // Auto-retry logic (max 3 attempts)
      if (retryCount < 3) {
        console.log(`🔄 Retrying... Attempt ${retryCount + 1}/3`);
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          fetchStats();
        }, 2000 * (retryCount + 1)); // Exponential backoff
      }
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchStats();

    // Set up auto-refresh every 5 minutes
    const interval = setInterval(() => {
      fetchStats(false); // Don't show loading for auto-refresh
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, []);

  const mockStats = [
    {
      title: 'Ventas Totales',
      value: '$24,890',
      change: '+12.5%',
      changeType: 'positive' as const,
      icon: '💰',
      description: 'Revenue del mes actual'
    },
    {
      title: 'Clientes Totales',
      value: '34',
      change: '+15.1%',
      changeType: 'positive' as const,
      icon: '👥',
      description: 'Registrados en el sistema'
    },
    {
      title: 'Apartados Activos',
      value: '18',
      change: '+18.7%',
      changeType: 'positive' as const,
      icon: '🏪',
      description: 'Valor en layaways'
    },
    {
      title: 'Productos en Inventario',
      value: '127',
      change: '+8.2%',
      changeType: 'positive' as const,
      icon: '📦',
      description: 'Total de productos'
    },
    {
      title: 'Stock Crítico',
      value: '18',
      change: '-5.2%',
      changeType: 'negative' as const,
      icon: '⚠️',
      description: 'Productos bajo mínimo'
    },
    {
      title: 'Servicios Activos',
      value: '45',
      change: '+22.1%',
      changeType: 'positive' as const,
      icon: '🔧',
      description: 'Órdenes en proceso'
    },
    {
      title: 'Ventas de Hoy',
      value: '$0',
      change: '+0.0%',
      changeType: 'neutral' as const,
      icon: '📅',
      description: 'Ventas realizadas hoy'
    },
    {
      title: 'Producto Más Vendido',
      value: 'N/A',
      change: '+0.0%',
      changeType: 'neutral' as const,
      icon: '🏆',
      description: 'Sin datos disponibles'
    }
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('es-VE').format(num);
  };

  const displayStats = stats ? [
    {
      title: 'Ventas Totales',
      value: formatCurrency(Number(stats.monthlyRevenue) || 0),
      change: stats.changes ? `${stats.changes.revenue >= 0 ? '+' : ''}${stats.changes.revenue.toFixed(1)}%` : '+12.5%',
      changeType: (stats.changes?.revenue || 0) >= 0 ? 'positive' as const : 'negative' as const,
      icon: '💰',
      description: `Revenue del mes actual (${stats.totalSales || 0} ventas)`
    },
    {
      title: 'Clientes Totales',
      value: formatNumber(stats.totalCustomers || 0),
      change: stats.changes ? `${stats.changes.customers >= 0 ? '+' : ''}${stats.changes.customers.toFixed(1)}%` : '+15.1%',
      changeType: (stats.changes?.customers || 0) >= 0 ? 'positive' as const : 'negative' as const,
      icon: '👥',
      description: `${stats.activeCustomers || 0} clientes activos`
    },
    {
      title: 'Ventas de Hoy',
      value: formatCurrency(Number(stats.todayRevenue) || 0),
      change: '+0.0%',
      changeType: 'neutral' as const,
      icon: '📅',
      description: `${stats.todaySales || 0} ventas realizadas hoy`
    },
    {
      title: 'Producto Más Vendido',
      value: stats.topProduct ? stats.topProduct.name : 'N/A',
      change: '+0.0%',
      changeType: 'neutral' as const,
      icon: '🏆',
      description: stats.topProduct ? `${stats.topProduct.quantity} unidades vendidas` : 'Sin datos'
    },
    {
      title: 'Apartados Activos',
      value: formatNumber(stats.apartados || 0),
      change: stats.changes ? `${stats.changes.apartados >= 0 ? '+' : ''}${stats.changes.apartados.toFixed(1)}%` : '+18.7%',
      changeType: (stats.changes?.apartados || 0) >= 0 ? 'positive' as const : 'negative' as const,
      icon: '🏪',
      description: `$${formatNumber(Number(stats.apartadosPendientes) || 0)} pendiente`
    },
    {
      title: 'Productos en Inventario',
      value: formatNumber(stats.totalProducts || 0),
      change: stats.changes ? `${stats.changes.products >= 0 ? '+' : ''}${stats.changes.products.toFixed(1)}%` : '+8.2%',
      changeType: (stats.changes?.products || 0) >= 0 ? 'positive' as const : 'negative' as const,
      icon: '📦',
      description: `Valor total: $${formatNumber(stats.inventoryValue || 0)}`
    },
    {
      title: 'Stock Crítico',
      value: formatNumber(stats.lowStockProducts || 0),
      change: '-5.2%',
      changeType: 'negative' as const,
      icon: '⚠️',
      description: 'Productos bajo el mínimo requerido'
    },
    {
      title: 'Servicios Activos',
      value: formatNumber(stats.totalServiceOrders || 0),
      change: stats.changes ? `${stats.changes.services >= 0 ? '+' : ''}${stats.changes.services.toFixed(1)}%` : '+22.1%',
      changeType: (stats.changes?.services || 0) >= 0 ? 'positive' as const : 'negative' as const,
      icon: '🔧',
      description: 'Órdenes de servicio en proceso'
    }
  ] : mockStats;

  if (error && !stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="col-span-full">
          <Card className="enterprise-card p-6">
            <div className="text-center">
              <div className="text-2xl mb-2">⚠️</div>
              <p className="text-sm font-medium text-foreground-secondary mb-2">
                Error al cargar estadísticas
              </p>
              <p className="text-xs text-foreground-secondary mb-4">
                {error}
              </p>
              <button
                onClick={() => {
                  setError(null);
                  setRetryCount(0);
                  setLoading(true);
                  // Trigger re-fetch
                  window.location.reload();
                }}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90 transition-colors"
              >
                Reintentar
              </button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Dashboard</h2>
        <div className="flex items-center gap-4">
          <button
            onClick={() => fetchStats(true)}
            disabled={loading}
            className="px-3 py-1 text-xs bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors disabled:opacity-50"
          >
            {loading ? 'Actualizando...' : 'Actualizar'}
          </button>
          <span className="text-xs text-foreground-secondary">
            Última actualización: {lastUpdate.toLocaleTimeString('es-VE')}
          </span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {displayStats.map((stat, index) => (
          <div key={stat.title} className="animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
            <StatCard {...stat} />
          </div>
        ))}
      </div>
    </div>
  );
}
