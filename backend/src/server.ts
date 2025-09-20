import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { PrismaClient } from '@prisma/client';
import { getEnvConfig, getCorsOrigins, getRateLimitConfig } from './config/env';
import path from 'path';
import fs from 'fs';
import multer from 'multer';

// Importar rutas
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import productRoutes from './routes/products';
import productStockRoutes from './routes/productStockRoutes';
import auditRoutes from './routes/auditRoutes';
import categoryRoutes from './routes/categories';
import brandRoutes from './routes/brands';
import customerRoutes, { testRouter as customersTestRouter } from './routes/customers';
import creditsRoutes, { testRouter as creditsTestRouter } from './routes/credits';
import saleRoutes from './routes/sales';
import serviceOrderRoutes from './routes/serviceOrders';
import inventoryRoutes from './routes/inventory';
import inventoryMovementRoutes from './routes/inventoryMovements';
import dashboardRoutes from './routes/dashboard';
import attributeRoutes from './routes/attributes';
import searchRoutes from './routes/search';
import barcodesRoutes from './routes/barcodes';

// Importar middleware
// Asegrate de que el archivo exista en './middleware/errorHandler.ts' o corrige la ruta/nombre si es necesario
// import { errorHandler } from './middleware/errorHandler';
// Asegrate de que el archivo exista o corrige la ruta a la ubicacin correcta
// Ejemplo si est en 'middlewares' en vez de 'middleware':
// import { errorHandler } from './middlewares/errorHandler';

import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';

// Validar y cargar configuracin de entorno
const env = getEnvConfig();

const app = express();
const server = createServer(app);
const prisma = new PrismaClient();

// Crear directorio uploads si no existe
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configuracin de Multer para subida de imgenes
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB lmite
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Solo se permiten imgenes (jpeg, jpg, png, gif, webp)'));
    }
  }
});

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
const rateLimitConfig = getRateLimitConfig();
const limiter = rateLimit({
  windowMs: rateLimitConfig.windowMs,
  max: rateLimitConfig.max,
  message: {
    error: 'Demasiadas solicitudes, intenta de nuevo ms tarde'
  }
});

// Middleware global
// Seguridad avanzada con Helmet y CSP estricta
// Definir fuentes de conexión explícitas para permitir llamadas Socket.IO (XHR + WS) entre puertos locales.
const cspConnectSrc = [
  "'self'",
  'ws:', 'wss:', // comodines para cualquier host WS en dev
  // Puertos locales comunes frontend/backend
  'http://localhost:3002', 'http://127.0.0.1:3002',
  'http://localhost:3000', 'http://127.0.0.1:3000',
  'http://localhost:5173', 'http://127.0.0.1:5173',
  'http://localhost:8080', 'http://localhost:8081', 'http://localhost:8082'
];

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:', 'http://localhost:8080', 'http://localhost:3000', 'http://localhost:5173'],
      connectSrc: cspConnectSrc,
      fontSrc: ["'self'", 'data:'],
      objectSrc: ["'none'"],
      frameAncestors: ["'self'"],
      upgradeInsecureRequests: [],
    },
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  hsts: env.NODE_ENV === 'production' ? { maxAge: 63072000, includeSubDomains: true, preload: true } : false,
}));

// Redireccin a HTTPS en produccin
if (env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(301, 'https://' + req.headers.host + req.url);
    }
    next();
  });
}
app.use(compression()); // Compresin
app.use(morgan('dev')); // Logs

// Configuracin de CORS robusta y nica
const allowedOrigins = [
  'http://localhost:8080',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:8081',
  'http://localhost:8082',
  'https://lovable.dev',
  'https://www.lovable.dev'
];
app.use(cors({
  origin: function (origin, callback) {
    // Permitir peticiones sin origen (como curl o postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      // En desarrollo permitir cualquier origen, en producción rechazar
      if (env.NODE_ENV === 'development') {
        return callback(null, true);
      }
      return callback(new Error('No permitido por CORS'), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Authorization']
}));

// Servir archivos estticos con CORS dinámico (no wildcard + credentials)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads'), {
  setHeaders: (res, path, stat) => {
    // No usar wildcard con credentials - usar origin dinámico
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  }
}));


// Middlewares globales que procesan JSON y URL-encoded.
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rutas que manejan multipart/form-data (con Multer)
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);

// Aplicar rate limiting a todas las rutas restantes
app.use('/api', limiter);

// Definir otras rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products-stock', authMiddleware, productStockRoutes);
app.use('/api/audit', authMiddleware, auditRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/credits', creditsRoutes);
app.use('/api', creditsTestRouter); // Rutas de prueba sin autenticación
app.use('/api', customersTestRouter); // Rutas de prueba sin autenticación
app.use('/api/sales', saleRoutes);
app.use('/api/service-orders', serviceOrderRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/inventory-movements', inventoryMovementRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/attributes', attributeRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/barcodes', barcodesRoutes);

// Ruta de salud
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'BikeShop ERP Backend est funcionando',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

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
  // Confirmación al cliente para depuración
  socket.emit('inventory:joined', { room: 'inventory', socketId: socket.id, ts: new Date().toISOString() });
  });

  socket.on('join-sales', () => {
    socket.join('sales');
  });
});

// Exportar io para usar en otros mdulos
export { io };

// Iniciar servidor
const PORT = env.PORT;

server.listen(PORT, () => {
  console.log(`🚀 Servidor BikeShop ERP iniciado en puerto ${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}/api/health`);
  console.log(`🔒 Entorno: ${env.NODE_ENV}`);
  console.log(`📡 Socket.IO habilitado para tiempo real`);
});

export default app;