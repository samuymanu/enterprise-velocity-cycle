import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { getEnvConfig } from '../config/env';

const env = getEnvConfig();

// Tipos MIME permitidos por categoría
const ALLOWED_MIME_TYPES = {
  images: [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp'
  ],
  documents: [
    'application/pdf'
  ]
};

// Extensiones permitidas por categoría
const ALLOWED_EXTENSIONS = {
  images: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
  documents: ['.pdf']
};

/**
 * Middleware de validación de archivos subidos
 * Valida tipo MIME, extensión, tamaño y nombre de archivo
 */
export function validateUploadedFiles(req: Request, res: Response, next: NextFunction) {
  try {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    
    if (!files || Object.keys(files).length === 0) {
      return next(); // No hay archivos, continuar
    }

    const errors: string[] = [];

    // Validar archivos de imágenes
    if (files.images) {
      for (const file of files.images) {
        const validation = validateFile(file, 'images');
        if (!validation.isValid) {
          errors.push(...validation.errors);
        }
      }
    }

    // Validar archivos de documentos (datasheet)
    if (files.datasheet) {
      for (const file of files.datasheet) {
        const validation = validateFile(file, 'documents');
        if (!validation.isValid) {
          errors.push(...validation.errors);
        }
      }
    }

    if (errors.length > 0) {
      // Limpiar archivos subidos en caso de error
      cleanupUploadedFiles(files);
      
      return res.status(400).json({
        error: 'Archivos inválidos',
        message: 'Uno o más archivos no cumplen con los requisitos de seguridad',
        details: errors
      });
    }

    next();
  } catch (error) {
    console.error('Error en validación de archivos:', error);
    
    // Limpiar archivos en caso de error
    if (req.files) {
      cleanupUploadedFiles(req.files as { [fieldname: string]: Express.Multer.File[] });
    }
    
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudo procesar la validación de archivos'
    });
  }
}

/**
 * Valida un archivo individual
 */
function validateFile(file: Express.Multer.File, category: 'images' | 'documents') {
  const errors: string[] = [];
  const maxSize = env.MAX_FILE_SIZE;

  // Validar tamaño
  if (file.size > maxSize) {
    errors.push(`Archivo "${file.originalname}" excede el tamaño máximo permitido (${maxSize / 1024 / 1024}MB)`);
  }

  // Validar tipo MIME
  if (!ALLOWED_MIME_TYPES[category].includes(file.mimetype)) {
    errors.push(`Archivo "${file.originalname}" tiene un tipo MIME no permitido: ${file.mimetype}`);
  }

  // Validar extensión
  const fileExtension = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS[category].includes(fileExtension)) {
    errors.push(`Archivo "${file.originalname}" tiene una extensión no permitida: ${fileExtension}`);
  }

  // Validar nombre de archivo (evitar caracteres peligrosos)
  const dangerousChars = /[<>:"/\\|?*\x00-\x1f]/;
  if (dangerousChars.test(file.originalname)) {
    errors.push(`Archivo "${file.originalname}" contiene caracteres no permitidos en el nombre`);
  }

  // Validar que el archivo existe físicamente
  if (!fs.existsSync(file.path)) {
    errors.push(`Archivo "${file.originalname}" no se guardó correctamente`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Limpia archivos subidos en caso de error
 */
function cleanupUploadedFiles(files: { [fieldname: string]: Express.Multer.File[] }) {
  try {
    Object.values(files).flat().forEach(file => {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
        console.log(`🗑️ Archivo limpiado: ${file.path}`);
      }
    });
  } catch (error) {
    console.error('Error limpiando archivos:', error);
  }
}

/**
 * Middleware para sanitizar nombres de archivos
 */
export function sanitizeFileNames(req: Request, res: Response, next: NextFunction) {
  try {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    
    if (!files || Object.keys(files).length === 0) {
      return next();
    }

    // Sanitizar nombres de archivos
    Object.values(files).flat().forEach(file => {
      // Limpiar caracteres especiales del nombre original
      file.originalname = file.originalname
        .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
        .replace(/\s+/g, '_')
        .toLowerCase();
    });

    next();
  } catch (error) {
    console.error('Error sanitizando nombres de archivos:', error);
    next();
  }
}

/**
 * Valida que las rutas de archivos sean seguras
 */
export function validateFilePaths(filePaths: string[]): boolean {
  return filePaths.every(filePath => {
    // Verificar que la ruta no contenga secuencias peligrosas
    const dangerousPatterns = [
      '../',
      '..\\',
      './',
      '.\\',
      '//',
      '\\\\'
    ];

    return !dangerousPatterns.some(pattern => filePath.includes(pattern));
  });
}

/**
 * Genera un nombre de archivo seguro y único
 */
export function generateSafeFileName(originalName: string): string {
  const timestamp = Date.now();
  const random = Math.round(Math.random() * 1E9);
  const extension = path.extname(originalName).toLowerCase();
  const baseName = path.basename(originalName, extension)
    .replace(/[^a-zA-Z0-9]/g, '_')
    .substring(0, 50); // Limitar longitud

  return `${baseName}_${timestamp}_${random}${extension}`;
}
