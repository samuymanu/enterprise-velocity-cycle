import React, { useState, useEffect } from 'react';
import authManager from '@/lib/authManager';
import { useNotify } from '@/stores/notificationStore';
import MovementForm from '@/components/inventory/MovementForm';
import StockDashboard from '@/components/inventory/StockDashboard';
import StockHistory from '@/components/inventory/StockHistory';

const StockManagement: React.FC = () => {
  const [productId, setProductId] = useState<string>('test-id');
  const token = authManager.hasValidToken() ? localStorage.getItem('authToken') : null;

  const { success: notifySuccess } = useNotify();

  useEffect(() => {
    const handler = (ev: any) => {
      const detail = ev.detail || {};
      if (detail.productId === productId) {
        console.log('Movimiento detectado para', productId, detail.data);
        try { notifySuccess('Movimiento aplicado', `Producto ${productId} actualizado`); } catch(_) {}
      }
    };

    window.addEventListener('inventory:movement', handler as EventListener);
    return () => window.removeEventListener('inventory:movement', handler as EventListener);
  }, [productId, notifySuccess]);

  return (
    <div style={{ padding: 20 }}>
      <h2>Gestión de stock (ejemplo)</h2>

      <div style={{ marginBottom: 12 }}>
        <label style={{ marginRight: 8 }}>Product ID:</label>
        <input value={productId} onChange={(e) => setProductId(e.target.value)} placeholder="product-id" />
      </div>

      <div style={{ display: 'flex', gap: 24, marginBottom: 24 }}>
        <div>
          <h4>Movimiento</h4>
          <MovementForm productId={productId} onSuccess={(d) => console.log('Movimiento OK', d)} />
        </div>

        <div>
          <h4>Métricas</h4>
          <StockDashboard productId={productId} />
        </div>
      </div>

      <div>
        <h4>Historial</h4>
        <StockHistory productId={productId} />
      </div>

      {token ? <div style={{ marginTop: 12 }}>Token en localStorage (presente)</div> : <div style={{ marginTop: 12 }}>No autenticado</div>}
    </div>
  );
};

export default StockManagement;
