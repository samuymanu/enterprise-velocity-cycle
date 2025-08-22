import React, { useState, useEffect } from 'react';
import authManager from '@/lib/authManager';

type InventoryMoveType = 'IN' | 'OUT' | 'ADJUSTMENT' | 'TRANSFER';

interface StockHistoryEntry {
  date: string;
  stock: number;
  movement: {
    id: string;
    type: InventoryMoveType;
    quantity: number;
    reason?: string;
    userId: string;
  };
}

interface Props {
  productId?: string;
  onError?: (error: string) => void;
}

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getMovementTypeLabel = (type: InventoryMoveType) => {
  const labels = {
    'IN': 'Entrada',
    'OUT': 'Salida', 
    'ADJUSTMENT': 'Ajuste',
    'TRANSFER': 'Transferencia'
  };
  return labels[type] || type;
};

const getMovementTypeColor = (type: InventoryMoveType) => {
  const colors = {
    'IN': '#22c55e',     // verde
    'OUT': '#ef4444',    // rojo
    'ADJUSTMENT': '#f59e0b', // amarillo
    'TRANSFER': '#3b82f6'    // azul
  };
  return colors[type] || '#6b7280';
};

export const StockHistory: React.FC<Props> = ({ productId = '', onError }) => {
  const [history, setHistory] = useState<StockHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState(30);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = async () => {
    if (!productId) {
      setError('productId no proporcionado');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = authManager.hasValidToken() ? localStorage.getItem('authToken') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(`/api/products-stock/${productId}/stock/history?days=${days}`, {
        headers
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data?.error || 'Error obteniendo historial');
      }

      setHistory(data.data?.history || []);
    } catch (err: any) {
      const errorMsg = err?.message || 'Error desconocido';
      setError(errorMsg);
      onError && onError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [productId, days]);

  // Escuchar eventos de movimiento para refrescar
  useEffect(() => {
    const handleMovement = (event: any) => {
      if (event.detail?.productId === productId) {
        fetchHistory();
      }
    };

    window.addEventListener('inventory:movement', handleMovement);
    return () => window.removeEventListener('inventory:movement', handleMovement);
  }, [productId]);

  const exportToCsv = () => {
    if (history.length === 0) return;

    const headers = ['Fecha', 'Tipo', 'Cantidad', 'Stock Resultante', 'Razón'];
    const csvContent = [
      headers.join(','),
      ...history.map(entry => [
        `"${formatDate(entry.date)}"`,
        `"${getMovementTypeLabel(entry.movement.type)}"`,
        entry.movement.quantity,
        entry.stock,
        `"${entry.movement.reason || ''}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `historial-stock-${productId}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div style={{ maxWidth: '100%', padding: '16px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
          Historial de Stock
        </h3>
        
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <select 
            value={days} 
            onChange={(e) => setDays(Number(e.target.value))}
            style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #d1d5db' }}
          >
            <option value={7}>7 días</option>
            <option value={30}>30 días</option>
            <option value={90}>90 días</option>
          </select>

          <button 
            onClick={exportToCsv}
            disabled={history.length === 0}
            style={{
              padding: '6px 12px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: history.length > 0 ? 'pointer' : 'not-allowed',
              opacity: history.length > 0 ? 1 : 0.5
            }}
          >
            Exportar CSV
          </button>

          <button 
            onClick={fetchHistory}
            disabled={loading}
            style={{
              padding: '6px 12px',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Cargando...' : 'Actualizar'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ 
          padding: '8px 12px', 
          backgroundColor: '#fef2f2', 
          border: '1px solid #fecaca', 
          borderRadius: '4px',
          color: '#dc2626',
          marginBottom: '16px'
        }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
          Cargando historial...
        </div>
      ) : history.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
          No hay movimientos en los últimos {days} días
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: '600px' }}>
            {/* Timeline visual */}
            <div style={{ position: 'relative', paddingLeft: '40px' }}>
              {/* Línea del timeline */}
              <div style={{
                position: 'absolute',
                left: '20px',
                top: '0',
                bottom: '0',
                width: '2px',
                backgroundColor: '#e5e7eb'
              }}></div>

              {history.map((entry, index) => (
                <div key={entry.movement.id} style={{ position: 'relative', marginBottom: '24px' }}>
                  {/* Punto del timeline */}
                  <div style={{
                    position: 'absolute',
                    left: '-28px',
                    top: '8px',
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    backgroundColor: getMovementTypeColor(entry.movement.type),
                    border: '3px solid white',
                    boxShadow: '0 0 0 1px #e5e7eb'
                  }}></div>

                  {/* Contenido del movimiento */}
                  <div style={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '16px',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div>
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '500',
                          color: 'white',
                          backgroundColor: getMovementTypeColor(entry.movement.type)
                        }}>
                          {getMovementTypeLabel(entry.movement.type)}
                        </span>
                        <span style={{ marginLeft: '12px', fontSize: '14px', color: '#6b7280' }}>
                          {formatDate(entry.date)}
                        </span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '16px', fontWeight: '600', color: '#111827' }}>
                          Stock: {entry.stock}
                        </div>
                        <div style={{ fontSize: '14px', color: '#6b7280' }}>
                          {entry.movement.type === 'IN' ? '+' : entry.movement.type === 'OUT' ? '-' : '±'}{entry.movement.quantity}
                        </div>
                      </div>
                    </div>

                    {entry.movement.reason && (
                      <div style={{ fontSize: '14px', color: '#374151', marginTop: '8px' }}>
                        <strong>Razón:</strong> {entry.movement.reason}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>
            Mostrando {history.length} movimientos de los últimos {days} días
          </div>
        </div>
      )}
    </div>
  );
};

export default StockHistory;
