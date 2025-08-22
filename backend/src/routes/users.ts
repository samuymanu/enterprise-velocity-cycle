import express from 'express';
import { PrismaClient } from '@prisma/client';
import { validateBody } from '../middleware/validation';
import { createUserSchema, updateUserSchema } from '../schemas/user';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();
router.use(authMiddleware);
const prisma = new PrismaClient();

// POST /api/users - Crear usuario
router.post('/', validateBody(createUserSchema), async (req, res) => {
  try {
    const user = await prisma.user.create({ data: req.body });
    res.status(201).json({ success: true, user });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Error al crear usuario' });
  }
});

// PUT /api/users/:id - Actualizar usuario
router.put('/:id', validateBody(updateUserSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.update({ where: { id }, data: req.body });
    res.json({ success: true, user });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Error al actualizar usuario' });
  }
});

export default router;
