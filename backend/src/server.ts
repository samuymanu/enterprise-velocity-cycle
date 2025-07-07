import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { Server } from 'socket.io';
import { createServer } from 'http';
import dotenv from 'dotenv';
import path from 'path';

// Importar rutas
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import productRoutes from './routes/products';
import categoryRoutes from './routes/categories';
import brandRoutes from './routes/brands';
import customerRoutes from './routes/customers';
import saleRoutes from './routes/sales';
import serviceOrderRoutes from './routes/serviceOrders';
import inventoryRoutes from './routes/inventory';
import dashboardRoutes from './routes/dashboard';

// Importar middleware
// Asegúrate de que el archivo exista en './middleware/errorHandler.ts' o corrige la ruta/nombre si es necesario
// import { errorHandler } from './middleware/errorHandler';
// Asegúrate de que el archivo exista o corrige la ruta a la ubicación correcta
// Ejemplo si está en 'middlewares' en vez de 'middleware':
// import { errorHandler } from './middlewares/errorHandler';

import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';

// Cargar variables de entorno
dotenv.config();

const app = express();
const server = createServer(app);

// Servir archivos estáticos desde la carpeta 'uploads'
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Configurar Socket.IO para tiempo real
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:8080",
      "http://localhost:8081", 
      "http://localhost:8082",
      "http://localhost:3000",
      "http://localhost:5173"
    ],
    methods: ["GET", "POST"]
  }
});

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutos
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // máximo 100 requests por ventana
  message: {
    error: 'Demasiadas solicitudes, intenta de nuevo más tarde'
  }
});

// Middleware global
app.use(compression()); // Compresión
app.use(morgan('combined')); // Logs

// CORS debe procesarse antes que otros middlewares como helmet o rate-limiter
// para asegurar que las cabeceras de CORS se apliquen correctamente a todas las respuestas,
// incluidas las de pre-flight (OPTIONS).
app.use(cors({
  origin: (origin, callback) => {
    // En desarrollo, podríamos ser más permisivos. 
    // Por ahora, permitimos cualquier origen para desbloquear el desarrollo.
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(helmet()); // Seguridad
app.use(limiter); // Rate limiting

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// El manejador de preflight ya no es necesario, cors() lo gestiona
/*
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.status(200).send();
});
*/

// Rutas de la API
app.get('/', (req, res) => {
  res.send('API de BikeShop ERP');
});

// Rutas públicas (no requieren autenticación)
app.use('/api/auth', authRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Middleware de autenticación para rutas protegidas
app.use('/api', (req, res, next) => {
  // Excluir rutas públicas - usar la URL completa
  if (req.url.startsWith('/auth') || req.url === '/health') {
    return next();
  }
  // Permitir GET para categorías y marcas (para formularios)
  if ((req.url.startsWith('/categories') || req.url.startsWith('/brands')) && req.method === 'GET') {
    return next();
  }
  // Aplicar autenticación para todas las demás rutas /api/*
  return authMiddleware(req, res, next);
});

// Rutas protegidas
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/service-orders', serviceOrderRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Middleware de manejo de errores (debe ir al final)
app.use(errorHandler);

// Manejo de rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    message: `La ruta ${req.originalUrl} no existe en este servidor`
  });
});

// Socket.IO para actualizaciones en tiempo real
io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);

  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
  });

  // Eventos personalizados para el ERP
  socket.on('join-dashboard', () => {
    socket.join('dashboard');
  });

  socket.on('join-inventory', () => {
    socket.join('inventory');
  });

  socket.on('join-sales', () => {
    socket.join('sales');
  });
});

// Exportar io para usar en otros módulos
export { io };

// Iniciar servidor
const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`🚀 Servidor BikeShop ERP iniciado en puerto ${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}/api/health`);
  console.log(`🔒 Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📡 Socket.IO habilitado para tiempo real`);
});

export default app;
