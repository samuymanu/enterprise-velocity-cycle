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
import categoryRoutes from './routes/categories';
import brandRoutes from './routes/brands';
import customerRoutes from './routes/customers';
import saleRoutes from './routes/sales';
import serviceOrderRoutes from './routes/serviceOrders';
import inventoryRoutes from './routes/inventory';
import dashboardRoutes from './routes/dashboard';
import attributeRoutes from './routes/attributes';

// Importar middleware
// Asegúrate de que el archivo exista en './middleware/errorHandler.ts' o corrige la ruta/nombre si es necesario
// import { errorHandler } from './middleware/errorHandler';
// Asegúrate de que el archivo exista o corrige la ruta a la ubicación correcta
// Ejemplo si está en 'middlewares' en vez de 'middleware':
// import { errorHandler } from './middlewares/errorHandler';

import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';

// Validar y cargar configuración de entorno
const env = getEnvConfig();

const app = express();
const server = createServer(app);
const prisma = new PrismaClient();

// Crear directorio uploads si no existe
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configuración de Multer para subida de imágenes
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
    fileSize: 5 * 1024 * 1024, // 5MB límite
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes (jpeg, jpg, png, gif, webp)'));
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
    error: 'Demasiadas solicitudes, intenta de nuevo más tarde'
  }
});

// Middleware global
// Seguridad avanzada con Helmet y CSP estricta
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:', 'http://localhost:8080', 'http://localhost:3000', 'http://localhost:5173'],
      connectSrc: ["'self'", 'ws:', 'wss:'],
      fontSrc: ["'self'", 'data:'],
      objectSrc: ["'none'"],
      frameAncestors: ["'self'"],
      upgradeInsecureRequests: [],
    },
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  // crossOriginResourcePolicy: { policy: 'cross-origin' }, // Omitido para evitar bloqueos
  hsts: env.NODE_ENV === 'production' ? { maxAge: 63072000, includeSubDomains: true, preload: true } : false,
}));

// Redirección a HTTPS en producción
if (env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(301, 'https://' + req.headers.host + req.url);
    }
    next();
  });
}
app.use(compression()); // Compresión
app.use(morgan('dev')); // Logs

// Configuración de CORS robusta y única
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
      // Permitir cualquier origen para pruebas remotas (comentar en producción)
      // return callback(new Error('No permitido por CORS'), false);
      return callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Authorization']
}));

// Servir archivos estáticos con CORS para todos los orígenes permitidos
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads'), {
  setHeaders: (res, path, stat) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  }
}));

// Rutas que manejan multipart/form-data (con Multer)
// Estas deben ir ANTES de express.json()
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);

// Middlewares globales que procesan JSON y URL-encoded.
// Ahora se aplican después de las rutas de archivos.
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Aplicar rate limiting a todas las rutas restantes
app.use('/api', limiter);

// Definir otras rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/service-orders', serviceOrderRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/attributes', attributeRoutes);

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
const PORT = env.PORT;

server.listen(PORT, () => {
  console.log(`🚀 Servidor BikeShop ERP iniciado en puerto ${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}/api/health`);
  console.log(`🔒 Entorno: ${env.NODE_ENV}`);
  console.log(`📡 Socket.IO habilitado para tiempo real`);
});

export default app;
