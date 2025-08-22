import React, { useEffect, useState } from 'react';
import authManager from '@/lib/authManager';

interface StockMetrics {
  productId: string;
  currentStock: number;
  minStock: number;
  maxStock?: number;
  stockLevel: string;
}

export const StockDashboard: React.FC<{ productId?: string }> = ({ productId = '' }) => {
  const [metrics, setMetrics] = useState<StockMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!productId) return;
    setLoading(true);
    setError(null);
    const token = authManager.hasValidToken() ? localStorage.getItem('authToken') : null;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    fetch(`/api/products-stock/${productId}/stock/metrics`, { headers })
      .then(r => r.json())
      .then(data => {
        if (!data.success) throw new Error(data.error || 'Error obteniendo métricas');
        setMetrics(data.data);
      })
      .catch(err => setError(err.message || 'Error'))
      .finally(() => setLoading(false));
  }, [productId]);

  // Refresh metrics when a movement is reported
  useEffect(() => {
    const handler = (ev: any) => {
      try {
        const detail = ev.detail || {};
        if (detail.productId === productId) {
          // re-trigger effect by setting same productId (fetch explicitly)
          setLoading(true);
          const token = authManager.hasValidToken() ? localStorage.getItem('authToken') : null;
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          if (token) headers['Authorization'] = `Bearer ${token}`;

          fetch(`/api/products-stock/${productId}/stock/metrics`, { headers })
            .then(r => r.json())
            .then(data => { if (data.success) setMetrics(data.data); })
            .catch(() => {})
            .finally(() => setLoading(false));
        }
      } catch (_) {}
    };

    window.addEventListener('inventory:movement', handler as EventListener);
    return () => window.removeEventListener('inventory:movement', handler as EventListener);
  }, [productId]);

  if (!productId) return <div>Seleccione un producto</div>;
  if (loading) return <div>Cargando métricas...</div>;
  if (error) return <div style={{ color: 'red' }}>{error}</div>;

  return (
    <div style={{ border: '1px solid #ddd', padding: 12, borderRadius: 6, maxWidth: 600 }}>
      <h3>Stock Metrics</h3>
      {metrics ? (
        <ul>
          <li>Producto: {metrics.productId}</li>
          <li>Stock actual: {metrics.currentStock}</li>
          <li>Stock mínimo: {metrics.minStock}</li>
          <li>Stock máximo: {metrics.maxStock ?? '—'}</li>
          <li>Nivel: {metrics.stockLevel}</li>
        </ul>
      ) : (
        <div>No hay métricas</div>
      )}
    </div>
  );
};

export default StockDashboard;
