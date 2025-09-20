import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();
const testRouter = express.Router(); // Router sin autenticación para pruebas
// Temporal: castear a any para evitar errores de tipado del TS server
const prisma = new PrismaClient() as any;

// Aplicar middleware de autenticación solo al router principal
router.use(authMiddleware);

// Listar apartados de un cliente
router.get('/customer/:customerId', async (req, res) => {
  try {
  const layaways = await prisma.layaway.findMany({
      where: { customerId: req.params.customerId },
      include: { payments: true, sale: true }
    });
    res.json({ success: true, layaways });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al obtener apartados' });
  }
});

// Obtener un apartado por ID
router.get('/:id', async (req, res) => {
  try {
  const layaway = await prisma.layaway.findUnique({
      where: { id: req.params.id },
      include: { payments: true, sale: true }
    });
    res.json({ success: true, layaway });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al obtener apartado' });
  }
});

// Crear un apartado
router.post('/', async (req, res) => {
  try {
  const layaway = await prisma.layaway.create({
      data: req.body
    });
    res.status(201).json({ success: true, layaway });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al crear apartado' });
  }
});

// Editar un apartado
router.put('/:id', async (req, res) => {
  try {
  const layaway = await prisma.layaway.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json({ success: true, layaway });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al actualizar apartado' });
  }
});

// Eliminar un apartado
router.delete('/:id', async (req, res) => {
  try {
  await prisma.layaway.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al eliminar apartado' });
  }
});

// Marcar apartado como completado
router.post('/:id/mark-completed', async (req, res) => {
  try {
  const layaway = await prisma.layaway.update({
      where: { id: req.params.id },
      data: { status: 'COMPLETADO' }
    });
    res.json({ success: true, layaway });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al marcar como completado' });
  }
});

// --- ABONOS ---
// Agregar abono
router.post('/:layawayId/payments', async (req, res) => {
  try {
  const payment = await prisma.layawayPayment.create({
      data: { ...req.body, layawayId: req.params.layawayId }
    });
    res.status(201).json({ success: true, payment });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al agregar abono' });
  }
});

// Editar abono
router.put('/payments/:id', async (req, res) => {
  try {
  const payment = await prisma.layawayPayment.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json({ success: true, payment });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al actualizar abono' });
  }
});

// Eliminar abono
router.delete('/payments/:id', async (req, res) => {
  try {
  await prisma.layawayPayment.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al eliminar abono' });
  }
});

// Router de pruebas sin autenticación
testRouter.get('/test-credits/:customerId', async (req, res) => {
  try {
  const layaways = await prisma.layaway.findMany({
      where: { customerId: req.params.customerId },
      include: { payments: true, sale: true }
    });
    res.json({ success: true, layaways });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al obtener apartados' });
  }
});

export default router;
export { testRouter };
