import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { Secret } from 'jsonwebtoken';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { getEnvConfig, getJwtConfig } from '../config/env';
import { validateBody } from '../middleware/validation';
import { authRateLimit } from '../middleware/rateLimiter';
import { 
  registerSchema, 
  loginSchema,
  authHeaderSchema 
} from '../schemas/validation';

const router = express.Router();
const prisma = new PrismaClient();
const env = getEnvConfig();
const jwtConfig = getJwtConfig();
const jwtSecret: Secret = jwtConfig.secret as Secret;

// Registro de usuario (solo admin puede crear usuarios)
router.post('/register', 
  authRateLimit,
  validateBody(registerSchema),
  async (req: Request, res: Response) => {
    try {
      const { email, username, password, firstName, lastName, role } = req.body;

      // Verificar si el usuario ya existe
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email },
            { username }
          ]
        }
      });

      if (existingUser) {
        return res.status(400).json({
          error: 'Usuario ya existe',
          message: 'Email o username ya están registrados'
        });
      }

      // Hashear password
      const hashedPassword = await bcrypt.hash(password, env.BCRYPT_ROUNDS);

      // Crear usuario
      const user = await prisma.user.create({
        data: {
          email,
          username,
          password: hashedPassword,
          firstName,
          lastName,
          role
        },
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          createdAt: true
        }
      });

      res.status(201).json({
        message: 'Usuario creado exitosamente',
        user
      });
    } catch (error) {
      console.error('Error en registro:', error);
      res.status(500).json({
        error: 'Error interno del servidor',
        message: 'No se pudo crear el usuario'
      });
    }
  }
);

// Login con refresh token
router.post('/login',
  authRateLimit,
  validateBody(loginSchema),
  async (req: Request, res: Response) => {
    try {
      const { identifier, password } = req.body;
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { email: identifier },
            { username: identifier }
          ],
          isActive: true
        }
      });
      if (!user) {
        return res.status(401).json({
          error: 'Credenciales inválidas',
          message: 'Usuario o password incorrectos'
        });
      }
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({
          error: 'Credenciales inválidas',
          message: 'Usuario o password incorrectos'
        });
      }
      // Generar access token
      // Forzar expiresIn a número de segundos (por ejemplo, 86400 para 1 día)
      const expiresIn: number = 86400; // 1 día
      const token = jwt.sign(
        { userId: user.id },
        jwtSecret,
        { expiresIn }
      );
      // Generar refresh token seguro
      const refreshToken = crypto.randomBytes(64).toString('hex');
      const expiresAt = new Date(Date.now() + msToMs(String(jwtConfig.refreshExpiresIn)));
      await prisma.refreshToken.create({
        data: {
          token: refreshToken,
          userId: user.id,
          ip: req.ip,
          userAgent: req.headers['user-agent'] || null,
          expiresAt
        }
      });
      res.json({
        message: 'Login exitoso',
        token,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role
        }
      });
    } catch (error) {
      console.error('Error en login:', error);
      res.status(500).json({
        error: 'Error interno del servidor',
        message: 'No se pudo procesar el login'
      });
    }
  }
);

// Refresh token endpoint
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token requerido' });
    }
    const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
    if (!stored || stored.revoked || stored.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Refresh token inválido o expirado' });
    }
    const user = await prisma.user.findUnique({ where: { id: stored.userId } });
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Usuario no válido' });
    }
    // Generar nuevo access token
    // Forzar expiresIn a número de segundos (por ejemplo, 86400 para 1 día)
    const expiresIn: number = 86400; // 1 día
    const token = jwt.sign(
      { userId: user.id },
      jwtSecret,
      { expiresIn }
    );
    // Opcional: rotar refresh token
    const newRefreshToken = crypto.randomBytes(64).toString('hex');
    const expiresAt = new Date(Date.now() + msToMs(jwtConfig.refreshExpiresIn as string));
    await prisma.refreshToken.update({
      where: { token: refreshToken },
      data: {
        revoked: true,
        revokedAt: new Date(),
        replacedBy: newRefreshToken
      }
    });
    await prisma.refreshToken.create({
      data: {
        token: newRefreshToken,
        userId: user.id,
        ip: req.ip,
        userAgent: req.headers['user-agent'] || null,
        expiresAt
      }
    });
    res.json({ token, refreshToken: newRefreshToken });
  } catch (error) {
    res.status(500).json({ error: 'Error al refrescar token' });
  }
});

// Logout seguro (revoca refresh token)
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token requerido' });
    }
    await prisma.refreshToken.updateMany({
      where: { token: refreshToken, revoked: false },
      data: { revoked: true, revokedAt: new Date() }
    });
    res.json({ message: 'Logout exitoso' });
  } catch (error) {
    res.status(500).json({ error: 'Error al hacer logout' });
  }
});

// Helper para convertir string de tiempo a ms
function msToMs(val: string): number {
  // Soporta "7d", "15m", "3600000" (ms)
  if (/^\d+$/.test(val)) return parseInt(val, 10);
  if (val.endsWith('d')) return parseInt(val) * 24 * 60 * 60 * 1000;
  if (val.endsWith('h')) return parseInt(val) * 60 * 60 * 1000;
  if (val.endsWith('m')) return parseInt(val) * 60 * 1000;
  if (val.endsWith('s')) return parseInt(val) * 1000;
  return 15 * 60 * 1000; // fallback 15min
}

// Verificar token
router.get('/verify', async (req: Request, res: Response) => {
  try {
    const authResult = authHeaderSchema.safeParse({ authorization: req.header('Authorization') });
    
    if (!authResult.success) {
      return res.status(401).json({
        error: 'Token requerido',
        message: 'No se proporcionó token de autenticación válido'
      });
    }

    const token = authResult.data.authorization.replace('Bearer ', '');

    const decoded = jwt.verify(token, jwtConfig.secret) as any;
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true
      }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        error: 'Token inválido',
        message: 'Usuario no encontrado o inactivo'
      });
    }

    res.json({
      valid: true,
      user
    });
  } catch (error) {
    res.status(401).json({
      error: 'Token inválido',
      message: 'Token expirado o malformado'
    });
  }
});

export default router;
