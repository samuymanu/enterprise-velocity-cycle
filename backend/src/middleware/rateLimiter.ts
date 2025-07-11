import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { getRateLimitConfig, isDevelopment } from '../config/env';

const rateLimitConfig = getRateLimitConfig();

/**
 * Rate limiter general para la aplicación
 */
export const generalRateLimit = rateLimit({
  windowMs: rateLimitConfig.windowMs, // 15 minutos por defecto
  max: rateLimitConfig.max, // 100 requests por defecto
  message: {
    error: 'Demasiadas solicitudes',
    message: 'Has excedido el límite de solicitudes. Intenta nuevamente más tarde.',
    retryAfter: Math.ceil(rateLimitConfig.windowMs / 1000 / 60) // en minutos
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // En desarrollo, no aplicar rate limiting
    return isDevelopment() && req.ip === '127.0.0.1';
  },
  keyGenerator: (req) => {
    // Usar IP + User ID si está autenticado para rate limiting más específico
    const userId = (req as any).user?.id;
    return userId ? `${req.ip}-${userId}` : req.ip || '';
  }
});

/**
 * Rate limiter estricto para autenticación (login, register)
 */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // Solo 5 intentos de login por IP cada 15 minutos
  message: {
    error: 'Demasiados intentos de autenticación',
    message: 'Has excedido el límite de intentos de login. Intenta nuevamente en 15 minutos.',
    retryAfter: 15
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => isDevelopment() && req.ip === '127.0.0.1'
});

/**
 * Rate limiter para creación de recursos (productos, categorías, etc.)
 */
export const createResourceRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 10, // 10 creaciones por minuto
  message: {
    error: 'Demasiadas creaciones',
    message: 'Has excedido el límite de creación de recursos. Intenta nuevamente en 1 minuto.',
    retryAfter: 1
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => isDevelopment() && req.ip === '127.0.0.1'
});

/**
 * Rate limiter para uploads de archivos
 */
export const uploadRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 5, // 5 uploads por minuto
  message: {
    error: 'Demasiados uploads',
    message: 'Has excedido el límite de subida de archivos. Intenta nuevamente en 1 minuto.',
    retryAfter: 1
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => isDevelopment() && req.ip === '127.0.0.1'
});

/**
 * Rate limiter para consultas de búsqueda
 */
export const searchRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 30, // 30 búsquedas por minuto
  message: {
    error: 'Demasiadas búsquedas',
    message: 'Has excedido el límite de búsquedas. Intenta nuevamente en 1 minuto.',
    retryAfter: 1
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => isDevelopment() || req.ip === '127.0.0.1' || req.ip === '::1'
});

/**
 * Slow down middleware para degradar gradualmente el rendimiento
 * en lugar de bloquear completamente
 */
export const apiSlowDown = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutos
  delayAfter: 50, // Después de 50 requests, empezar a delay
  delayMs: () => 100, // Incrementar delay en 100ms por request (nuevo comportamiento v2)
  maxDelayMs: 5000, // Máximo delay de 5 segundos
  skip: (req) => isDevelopment() && req.ip === '127.0.0.1'
});

/**
 * Rate limiter personalizable para casos específicos
 */
export function createCustomRateLimit(options: {
  windowMs: number;
  max: number;
  message: string;
  skipDevelopment?: boolean;
}) {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    message: {
      error: 'Límite excedido',
      message: options.message,
      retryAfter: Math.ceil(options.windowMs / 1000 / 60)
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      return options.skipDevelopment !== false && 
             isDevelopment() && 
             req.ip === '127.0.0.1';
    }
  });
}

/**
 * Rate limiter por roles - más permisivo para admins
 */
export function createRoleBasedRateLimit(limits: {
  ADMIN: number;
  MANAGER: number;
  EMPLOYEE: number;
  TECHNICIAN: number;
  CASHIER: number;
  GUEST: number;
}, windowMs: number = 15 * 60 * 1000) {
  return rateLimit({
    windowMs,
    max: (req) => {
      const user = (req as any).user;
      const role = user?.role || 'GUEST';
      return limits[role as keyof typeof limits] || limits.GUEST;
    },
    message: {
      error: 'Límite de solicitudes excedido',
      message: 'Has excedido el límite basado en tu rol. Intenta nuevamente más tarde.',
      retryAfter: Math.ceil(windowMs / 1000 / 60)
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => isDevelopment() && req.ip === '127.0.0.1',
    keyGenerator: (req) => {
      const user = (req as any).user;
      return user?.id ? `role-${user.role}-${user.id}` : req.ip || '';
    }
  });
}
