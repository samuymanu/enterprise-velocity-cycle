import { z } from 'zod';
import dotenv from 'dotenv';

// Schema de validación para variables de entorno
const envSchema = z.object({
  // Base de datos
  DATABASE_URL: z.string().url('DATABASE_URL debe ser una URL válida'),
  
  // JWT
  JWT_SECRET: z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET debe tener al menos 32 caracteres'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  
  // Admin
  ADMIN_EMAIL: z.string().email('ADMIN_EMAIL debe ser un email válido'),
  ADMIN_PASSWORD: z.string().min(8, 'ADMIN_PASSWORD debe tener al menos 8 caracteres'),
  ADMIN_FIRST_NAME: z.string().min(1, 'ADMIN_FIRST_NAME es requerido'),
  ADMIN_LAST_NAME: z.string().min(1, 'ADMIN_LAST_NAME es requerido'),
  
  // Servidor
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1000).max(65535)),
  
  // Seguridad
  BCRYPT_ROUNDS: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(10).max(15)).default(12),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET debe tener al menos 32 caracteres'),
  SESSION_MAX_AGE: z.string().transform(val => parseInt(val, 10)).pipe(z.number().positive()).default(86400000),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().transform(val => parseInt(val, 10)).pipe(z.number().positive()).default(900000),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(val => parseInt(val, 10)).pipe(z.number().positive()).default(100),
  
  // CORS
  CORS_ORIGIN: z.string().min(1, 'CORS_ORIGIN es requerido'),
  
  // Upload
  MAX_FILE_SIZE: z.string().transform(val => parseInt(val, 10)).pipe(z.number().positive()).default(5242880),
  UPLOAD_ALLOWED_TYPES: z.string().min(1, 'UPLOAD_ALLOWED_TYPES es requerido').default('jpeg,jpg,png,gif,webp'),
  
  // Socket.IO
  SOCKET_CORS_ORIGIN: z.string().min(1, 'SOCKET_CORS_ORIGIN es requerido'),
});

export type EnvConfig = z.infer<typeof envSchema>;

/**
 * Valida y carga las variables de entorno
 * @returns {EnvConfig} Variables de entorno validadas
 * @throws {Error} Si alguna variable es inválida o falta
 */
export function validateEnv(): EnvConfig {
  try {
    // Cargar variables de entorno
    if (process.env.NODE_ENV !== 'production') {
      dotenv.config();
    }

    // Validar con Zod
    const validatedEnv = envSchema.parse(process.env);
    
    console.log('✅ Variables de entorno validadas correctamente');
    console.log(`📊 Entorno: ${validatedEnv.NODE_ENV}`);
    console.log(`🔌 Puerto: ${validatedEnv.PORT}`);
    console.log(`🔒 JWT expira en: ${validatedEnv.JWT_EXPIRES_IN}`);
    
    return validatedEnv;
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Error en variables de entorno:');
      error.issues.forEach((err: any) => {
        console.error(`   ${err.path.join('.')}: ${err.message}`);
      });
    } else {
      console.error('❌ Error cargando variables de entorno:', error);
    }
    
    process.exit(1);
  }
}

/**
 * Obtiene la configuración validada de entorno
 * Singleton pattern para evitar validar múltiples veces
 */
let envConfig: EnvConfig | null = null;

export function getEnvConfig(): EnvConfig {
  if (!envConfig) {
    envConfig = validateEnv();
  }
  return envConfig;
}

/**
 * Helper para verificar si estamos en producción
 */
export function isProduction(): boolean {
  return getEnvConfig().NODE_ENV === 'production';
}

/**
 * Helper para verificar si estamos en desarrollo
 */
export function isDevelopment(): boolean {
  return getEnvConfig().NODE_ENV === 'development';
}

/**
 * Helper para verificar si estamos en testing
 */
export function isTesting(): boolean {
  return getEnvConfig().NODE_ENV === 'test';
}

/**
 * Helper para obtener la URL de base de datos
 */
export function getDatabaseUrl(): string {
  return getEnvConfig().DATABASE_URL;
}

/**
 * Helper para obtener configuración JWT
 */
export function getJwtConfig() {
  const config = getEnvConfig();
  return {
    secret: config.JWT_SECRET,
    refreshSecret: config.JWT_REFRESH_SECRET,
    expiresIn: config.JWT_EXPIRES_IN,
    refreshExpiresIn: config.JWT_REFRESH_EXPIRES_IN
  };
}

/**
 * Helper para obtener configuración de CORS
 */
export function getCorsOrigins(): string[] {
  return getEnvConfig().CORS_ORIGIN.split(',').map(origin => origin.trim());
}

/**
 * Helper para obtener configuración de rate limiting
 */
export function getRateLimitConfig() {
  const config = getEnvConfig();
  return {
    windowMs: config.RATE_LIMIT_WINDOW_MS,
    max: config.RATE_LIMIT_MAX_REQUESTS
  };
}
