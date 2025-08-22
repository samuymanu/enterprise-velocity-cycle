import express from 'express';
import { PrismaClient } from '@prisma/client';
import { validateBody } from '../middleware/validation';
import { createServiceOrderSchema, updateServiceOrderSchema } from '../schemas/serviceOrder';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();
router.use(authMiddleware);
const prisma = new PrismaClient();

// POST /api/serviceOrders - Crear orden de servicio
router.post('/', validateBody(createServiceOrderSchema), async (req, res) => {
  try {
    const serviceOrder = await prisma.serviceOrder.create({ data: req.body });
    res.status(201).json({ success: true, serviceOrder });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Error al crear orden de servicio' });
  }
});

// PUT /api/serviceOrders/:id - Actualizar orden de servicio
router.put('/:id', validateBody(updateServiceOrderSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const serviceOrder = await prisma.serviceOrder.update({ where: { id }, data: req.body });
    res.json({ success: true, serviceOrder });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Error al actualizar orden de servicio' });
  }
});

export default router;
