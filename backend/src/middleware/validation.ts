import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';
import { isDevelopment } from '../config/env';
import path from 'path';

/**
 * Configuración de validación de archivos
 */
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_DOCUMENT_TYPES = ['application/pdf'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Sanitización de archivos subidos
 */
export function validateFiles(req: Request, res: Response, next: NextFunction) {
  try {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | Express.Multer.File[];
    
    if (!files) {
      return next();
    }

    // Validar archivos de imagen
    if ('images' in files && Array.isArray(files.images)) {
      for (const file of files.images) {
        if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
          return res.status(400).json({
            error: 'Tipo de archivo no permitido',
            message: `Solo se permiten imágenes: ${ALLOWED_IMAGE_TYPES.join(', ')}`,
            file: file.originalname
          });
        }
        if (file.size > MAX_FILE_SIZE) {
          return res.status(400).json({
            error: 'Archivo demasiado grande',
            message: `El archivo ${file.originalname} excede el tamaño máximo de 5MB`
          });
        }
      }
    }

    // Validar archivos de ficha técnica
    if ('datasheet' in files && Array.isArray(files.datasheet)) {
      for (const file of files.datasheet) {
        if (!ALLOWED_DOCUMENT_TYPES.includes(file.mimetype)) {
          return res.status(400).json({
            error: 'Tipo de documento no permitido',
            message: 'Solo se permiten archivos PDF para fichas técnicas',
            file: file.originalname
          });
        }
        if (file.size > MAX_FILE_SIZE) {
          return res.status(400).json({
            error: 'Archivo demasiado grande',
            message: `El archivo ${file.originalname} excede el tamaño máximo de 5MB`
          });
        }
      }
    }

    next();
  } catch (error) {
    console.error('Error en validación de archivos:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Error procesando la validación de archivos'
    });
  }
}

/**
 * Middleware de validación genérico para esquemas Zod
 * @param schema Schema de Zod para validar
 * @param target Objetivo de validación ('body', 'query', 'params')
 */
export function validateSchema<T extends z.ZodType>(
  schema: T,
  target: 'body' | 'query' | 'params' = 'body'
) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const dataToValidate = req[target];
      
      // Validar los datos
      const result = schema.safeParse(dataToValidate);
      
      if (!result.success) {
        // Log detallado en desarrollo
        if (isDevelopment()) {
          console.error('❌ Error de validación:', {
            target,
            data: dataToValidate,
            errors: result.error.issues
          });
        }
        
        return res.status(400).json({
          error: 'Datos de entrada inválidos',
          details: result.error.issues.map((err: z.ZodIssue) => ({
            field: err.path.join('.'),
            message: err.message,
            received: (err as any).input
          }))
        });
      }
      
      // Reemplazar los datos originales con los validados y transformados
      req[target] = result.data;
      
      next();
    } catch (error) {
      console.error('Error en middleware de validación:', error);
      res.status(500).json({
        error: 'Error interno del servidor',
        message: 'Error procesando la validación'
      });
    }
  };
}

/**
 * Middleware específico para validar body
 */
export function validateBody<T extends z.ZodType>(schema: T) {
  return validateSchema(schema, 'body');
}

/**
 * Middleware específico para validar query parameters
 */
export function validateQuery<T extends z.ZodType>(schema: T) {
  return validateSchema(schema, 'query');
}

/**
 * Middleware específico para validar params
 */
export function validateParams<T extends z.ZodType>(schema: T) {
  return validateSchema(schema, 'params');
}

/**
 * Sanitiza cadenas de texto para prevenir XSS
 */
export function sanitizeHtml(str: string): string {
  if (typeof str !== 'string') return str;
  
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Middleware para sanitizar recursivamente todos los strings en el body
 */
export function sanitizeBody(req: Request, res: Response, next: NextFunction) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  next();
}

/**
 * Sanitiza recursivamente un objeto
 */
function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return sanitizeHtml(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  
  if (obj !== null && typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        sanitized[key] = sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  }
  
  return obj;
}

/**
 * Middleware de validación para archivos subidos
 */
export function validateFileUpload(
  allowedMimeTypes: string[] = ['image/jpeg', 'image/png', 'image/webp'],
  maxSizeBytes: number = 5 * 1024 * 1024 // 5MB
) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.files && !req.file) {
      return next(); // No hay archivos, continuar
    }
    
    const files = req.files ? 
      (Array.isArray(req.files) ? req.files : Object.values(req.files).flat()) :
      [req.file];
    
    for (const file of files) {
      if (!file) continue;
      
      // Validar tipo MIME
      if (!allowedMimeTypes.includes(file.mimetype)) {
        return res.status(400).json({
          error: 'Tipo de archivo no permitido',
          message: `Tipos permitidos: ${allowedMimeTypes.join(', ')}`,
          received: file.mimetype
        });
      }
      
      // Validar tamaño
      if (file.size > maxSizeBytes) {
        return res.status(400).json({
          error: 'Archivo demasiado grande',
          message: `Tamaño máximo: ${maxSizeBytes / (1024 * 1024)}MB`,
          received: `${(file.size / (1024 * 1024)).toFixed(2)}MB`
        });
      }
      
      // Validar extensión del archivo
      const allowedExtensions = allowedMimeTypes.map(mime => {
        switch (mime) {
          case 'image/jpeg': return ['.jpg', '.jpeg'];
          case 'image/png': return ['.png'];
          case 'image/webp': return ['.webp'];
          case 'image/gif': return ['.gif'];
          case 'application/pdf': return ['.pdf'];
          default: return [];
        }
      }).flat();
      
      const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
      if (!allowedExtensions.includes(fileExtension)) {
        return res.status(400).json({
          error: 'Extensión de archivo no permitida',
          message: `Extensiones permitidas: ${allowedExtensions.join(', ')}`,
          received: fileExtension
        });
      }
    }
    
    next();
  };
}

/**
 * Middleware para validar que el usuario autenticado tiene los roles requeridos
 */
export function validateRoles(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({
        error: 'No autenticado',
        message: 'Se requiere autenticación'
      });
    }
    
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({
        error: 'Acceso denegado',
        message: 'No tienes permisos para realizar esta acción',
        required: allowedRoles,
        current: user.role
      });
    }
    
    next();
  };
}

/**
 * Middleware para registrar requests en desarrollo
 */
export function logRequest(req: Request, res: Response, next: NextFunction) {
  if (isDevelopment()) {
    console.log(`📝 ${req.method} ${req.path}`, {
      query: req.query,
      body: req.method !== 'GET' ? req.body : undefined,
      user: (req as any).user?.id
    });
  }
  next();
}
