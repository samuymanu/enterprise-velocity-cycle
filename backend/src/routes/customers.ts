import express from 'express';
import { PrismaClient } from '@prisma/client';
import { validateBody } from '../middleware/validation';
import { createCustomerSchema, updateCustomerSchema } from '../schemas/customer';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();
router.use(authMiddleware);
const prisma = new PrismaClient();

// POST /api/customers - Crear cliente
router.post('/', validateBody(createCustomerSchema), async (req, res) => {
  try {
    const customer = await prisma.customer.create({ data: req.body });
    res.status(201).json({ success: true, customer });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Error al crear cliente' });
  }
});

// PUT /api/customers/:id - Actualizar cliente
router.put('/:id', validateBody(updateCustomerSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await prisma.customer.update({ where: { id }, data: req.body });
    res.json({ success: true, customer });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Error al actualizar cliente' });
  }
});

export default router;
