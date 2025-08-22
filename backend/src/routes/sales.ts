import express from 'express';
import { PrismaClient } from '@prisma/client';
import { validateBody } from '../middleware/validation';
import { createSaleSchema, updateSaleSchema } from '../schemas/sale';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();
router.use(authMiddleware);
const prisma = new PrismaClient();

// POST /api/sales - Crear venta
router.post('/', validateBody(createSaleSchema), async (req, res) => {
  try {
    const sale = await prisma.sale.create({ data: req.body });
    res.status(201).json({ success: true, sale });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Error al crear venta' });
  }
});

// PUT /api/sales/:id - Actualizar venta
router.put('/:id', validateBody(updateSaleSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const sale = await prisma.sale.update({ where: { id }, data: req.body });
    res.json({ success: true, sale });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Error al actualizar venta' });
  }
});

export default router;
