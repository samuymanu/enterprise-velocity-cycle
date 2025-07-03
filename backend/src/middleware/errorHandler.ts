import { Request, Response, NextFunction } from 'express';

export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', error);

  // Error de validación de Prisma
  if (error.code === 'P2002') {
    return res.status(400).json({
      error: 'Datos duplicados',
      message: 'Ya existe un registro con esos datos',
      field: error.meta?.target
    });
  }

  // Error de registro no encontrado
  if (error.code === 'P2025') {
    return res.status(404).json({
      error: 'Registro no encontrado',
      message: 'El registro solicitado no existe'
    });
  }

  // Error de validación
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Error de validación',
      message: error.message,
      details: error.errors
    });
  }

  // Error de JWT
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Token inválido',
      message: 'Token de autenticación inválido'
    });
  }

  // Error de JWT expirado
  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token expirado',
      message: 'El token de autenticación ha expirado'
    });
  }

  // Error genérico del servidor
  res.status(500).json({
    error: 'Error interno del servidor',
    message: process.env.NODE_ENV === 'production' 
      ? 'Algo salió mal, intenta de nuevo más tarde'
      : error.message
  });
};
