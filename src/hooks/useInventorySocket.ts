import { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';

type Socket = ReturnType<typeof io>;

interface UseInventorySocketOptions {
  autoConnect?: boolean;
  onStockUpdate?: (productId: string, newStock: number) => void;
  onProductUpdate?: (productData: any) => void;
  onSaleCompleted?: (saleData: any) => void;
}

interface ConnectionAttempt {
  url: string;
  success: boolean;
  error?: string;
  ts: number;
}

export function useInventorySocket(options: UseInventorySocketOptions = {}) {
  const {
    autoConnect = true,
    onStockUpdate,
    onProductUpdate,
    onSaleCompleted
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [activeUrl, setActiveUrl] = useState<string | null>(null);
  const [attempts, setAttempts] = useState<ConnectionAttempt[]>([]);
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const normalizeUrl = (raw?: string) => {
    if (!raw) return undefined;
    const trimmed = raw.trim().replace(/\/$/, '');
    // Si incluye /api al final, removerlo para Socket.IO base
    return trimmed.endsWith('/api') ? trimmed.slice(0, -4) : trimmed;
  };

  const buildCandidateUrls = (): string[] => {
    const envWs = normalizeUrl((import.meta as any).env?.VITE_WS_URL);
    const envApi = normalizeUrl((import.meta as any).env?.VITE_API_URL);
    const guesses = new Set<string>();
    if (envWs) guesses.add(envWs);
    if (envApi) guesses.add(envApi);
    // Si origen actual es distinto, intentar mismo host con 3002 / 3000
    try {
      const loc = window.location;
      guesses.add(`${loc.protocol}//${loc.hostname}:3002`);
      guesses.add(`${loc.protocol}//${loc.hostname}:3000`);
    } catch {}
    guesses.add('http://localhost:3002');
    guesses.add('http://127.0.0.1:3002');
    guesses.add('http://localhost:3000');
    return Array.from(guesses).filter(Boolean);
  };

  const cleanupSocket = () => {
    if (socketRef.current) {
      try { socketRef.current.removeAllListeners(); } catch {}
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  };

  const attemptConnection = (urls: string[], index = 0) => {
    if (index >= urls.length) {
      console.error('❌ No se pudo conectar a ningún endpoint WebSocket', attempts);
      setIsConnecting(false);
      return;
    }

    const url = urls[index];
    console.log(`🔌 Intentando conexión WebSocket (#${index + 1}): ${url}`);
    cleanupSocket();
    setActiveUrl(url);
    setIsConnecting(true);

    const socket = io(url, {
      transports: ['websocket', 'polling'],
      timeout: 4000,
      reconnection: true,
      reconnectionAttempts: 4,
      reconnectionDelay: 1200,
      autoConnect: true,
      forceNew: true
    });
    socketRef.current = socket;

    const registerListeners = () => {
      socket.on('inventory:stock-updated', (data: { productId: string; newStock: number; productName: string }) => {
        console.log('📦 Stock actualizado via WebSocket:', data);
        onStockUpdate?.(data.productId, data.newStock);
      });
      socket.on('inventory:product-updated', (data: any) => {
        console.log('📝 Producto actualizado via WebSocket:', data);
        onProductUpdate?.(data);
      });
      socket.on('sales:completed', (data: any) => {
        console.log('💰 Venta completada via WebSocket:', data);
        onSaleCompleted?.(data);
      });
      socket.on('inventory:joined', (info: any) => {
        console.log('✅ Confirmación de unión a sala inventory:', info);
      });
    };

    registerListeners();

    if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
    connectionTimeoutRef.current = setTimeout(() => {
      if (!socket.connected) {
        console.warn('⏱️ Conexión no establecida a tiempo, probando siguiente URL');
        setAttempts(prev => [...prev, { url, success: false, error: 'timeout', ts: Date.now() }]);
        attemptConnection(urls, index + 1);
      }
    }, 1500);

    socket.once('connect', () => {
      if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
      console.log('✅ WebSocket conectado:', socket.id, 'URL:', url);
      setAttempts(prev => [...prev, { url, success: true, ts: Date.now() }]);
      setIsConnected(true);
      setIsConnecting(false);
  try { (window as any).__inventorySocket = socket; } catch {}
      socket.emit('join-inventory');
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket desconectado:', reason, 'URL activa:', url);
      setIsConnected(false);
      // No cambiar activeUrl inmediatamente; permitir reconexión automática
    });

    socket.on('connect_error', (error: any) => {
      console.error('❌ Error de conexión WebSocket:', error?.message || error, 'URL:', url);
      setAttempts(prev => [...prev, { url, success: false, error: error?.message || String(error), ts: Date.now() }]);
      // Intentar siguiente endpoint
      if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
      attemptConnection(urls, index + 1);
    });
  };

  const connect = () => {
    if (socketRef.current?.connected) {
      console.log('🔌 Socket ya está conectado');
      return;
    }
    const urls = buildCandidateUrls();
    console.log('🔍 URLs candidatas para WebSocket:', urls);
    attemptConnection(urls, 0);
  };

  const disconnect = () => {
    if (socketRef.current) {
      console.log('🔌 Desconectando WebSocket...');
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
      setIsConnecting(false);
    }
  };

  const emit = (event: string, data?: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    } else {
      console.warn('⚠️ Socket no conectado, no se puede emitir evento:', event);
    }
  };

  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect]);

  return {
    isConnected,
    isConnecting,
  activeUrl,
  attempts,
    connect,
    disconnect,
    emit,
    socket: socketRef.current
  };
}
