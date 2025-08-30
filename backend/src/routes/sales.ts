import express from 'express';
import { PrismaClient } from '@prisma/client';
import { validateBody } from '../middleware/validation';
import { createSaleSchema, updateSaleSchema } from '../schemas/sale';
import { authMiddleware } from '../middleware/auth';
import { createSaleService } from '../services/saleService';

const router = express.Router();
router.use(authMiddleware);
const prisma = new PrismaClient();

// POST /api/sales - Crear venta
router.post('/', validateBody(createSaleSchema), async (req, res) => {
  try {
    const saleData = req.body;
    const userId = (req as any).user?.id; // Obtener userId del middleware de auth

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Usuario no autenticado' });
    }

    const sale = await createSaleService({
      ...saleData,
      userId
    });

    res.status(201).json({ success: true, sale });
  } catch (error: any) {
    console.error('Error creating sale:', error);
    res.status(500).json({ success: false, error: error.message || 'Error al crear venta' });
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
