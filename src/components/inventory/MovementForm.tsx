import React, { useState } from 'react';
import authManager from '@/lib/authManager';
import { useNotify } from '@/stores/notificationStore';

type InventoryMoveType = 'IN' | 'OUT' | 'ADJUSTMENT';

interface Props {
  productId?: string;
  onSuccess?: (data: any) => void;
}

export const MovementForm: React.FC<Props> = ({ productId = '', onSuccess }) => {
  const { success: notifySuccess, error: notifyError } = useNotify();
  const [type, setType] = useState<InventoryMoveType>('IN');
  const [quantity, setQuantity] = useState<number>(1);
  const [reason, setReason] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Basic validation
    if (!productId) {
      setError('productId no proporcionado');
      setLoading(false);
      return;
    }
    if (!quantity || quantity <= 0) {
      setError('Cantidad debe ser mayor que 0');
      setLoading(false);
      return;
    }

    try {
      const token = authManager.hasValidToken() ? localStorage.getItem('authToken') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/products-stock/${productId}/stock/update`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ type, quantity, reason })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Error desconocido');
  onSuccess && onSuccess(data);
  // Notify UI
  try { notifySuccess('Movimiento registrado', `Producto ${productId} actualizado`); } catch(_) {}

  try { window.dispatchEvent(new CustomEvent('inventory:movement', { detail: { productId, data } })); } catch(_) {}
    } catch (err: any) {
  const msg = err?.message || 'Error en la operación';
  setError(msg);
  try { notifyError('Error al crear movimiento', msg); } catch(_) {}
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} style={{ maxWidth: 560 }}>
      <div style={{ marginBottom: 8 }}>
        <label>Tipo</label>
        <select value={type} onChange={(e) => setType(e.target.value as InventoryMoveType)}>
          <option value="IN">IN (entrada)</option>
          <option value="OUT">OUT (salida)</option>
          <option value="ADJUSTMENT">ADJUSTMENT</option>
        </select>
      </div>

      <div style={{ marginBottom: 8 }}>
        <label>Cantidad</label>
        <input type="number" value={quantity} min={1} onChange={(e) => setQuantity(Number(e.target.value))} />
      </div>

      <div style={{ marginBottom: 8 }}>
        <label>Razón</label>
        <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>

      {error && <div style={{ color: 'red' }}>{error}</div>}

      <button type="submit" disabled={loading}>
        {loading ? 'Procesando...' : 'Enviar movimiento'}
      </button>
    </form>
  );
};

export default MovementForm;
