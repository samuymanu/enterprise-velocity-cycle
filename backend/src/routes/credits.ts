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
      include: {
        payments: true,
        sale: {
          include: {
            saleItems: {
              include: {
                product: true
              }
            }
          }
        }
      }
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
      include: {
        payments: true,
        sale: {
          include: {
            saleItems: {
              include: {
                product: true
              }
            }
          }
        }
      }
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

// Crear apartado sin autenticación (para desarrollo)
testRouter.post('/test-credits', async (req, res) => {
  try {
    const { customerId: requestedCustomerId, totalAmount, initialPayment, dueDate, status, paymentMethod, ...otherData } = req.body;

    console.log('🔍 Backend - Recibiendo solicitud de apartado:', {
      requestedCustomerId,
      totalAmount,
      initialPayment,
      dueDate,
      body: req.body
    });

    // Usar el customerId real que viene del frontend, o crear uno de desarrollo si no se proporciona
    let actualCustomerId = requestedCustomerId || 'dev-customer-001';
    let devUserId = 'dev-user-001';

    console.log('🔄 Backend - Buscando cliente con ID:', actualCustomerId);

    // Verificar si el cliente existe, si no, buscar por otros criterios o crear uno
    let customer = await prisma.customer.findUnique({ where: { id: actualCustomerId } });
    console.log('👤 Backend - Cliente encontrado por ID:', customer ? 'SÍ' : 'NO');

    // Si no existe el cliente con ese ID, intentar buscar por documento o nombre
    if (!customer && requestedCustomerId) {
      console.log('🔍 Backend - Buscando cliente alternativo...');
      // Buscar por documento si el requestedCustomerId parece ser un documento
      if (requestedCustomerId.match(/^\d+$/)) {
        customer = await prisma.customer.findFirst({
          where: { documentNumber: requestedCustomerId }
        });
        console.log('📄 Backend - Encontrado por documento:', customer ? 'SÍ' : 'NO');
      }

      // Si aún no se encuentra, buscar por nombre/email que contenga el ID
      if (!customer) {
        customer = await prisma.customer.findFirst({
          where: {
            OR: [
              { firstName: { contains: requestedCustomerId, mode: 'insensitive' } },
              { lastName: { contains: requestedCustomerId, mode: 'insensitive' } },
              { email: { contains: requestedCustomerId, mode: 'insensitive' } }
            ]
          }
        });
        console.log('📧 Backend - Encontrado por nombre/email:', customer ? 'SÍ' : 'NO');
      }
    }

    // Si no se encuentra ningún cliente, crear uno de desarrollo
    if (!customer) {
      console.log('🆕 Backend - Creando cliente de desarrollo...');
      const uniqueDocNumber = `DEV${Date.now()}`;
      customer = await prisma.customer.create({
        data: {
          documentType: 'CI',
          documentNumber: uniqueDocNumber,
          firstName: 'Cliente',
          lastName: 'Desarrollo',
          customerType: 'INDIVIDUAL',
          email: `dev${Date.now()}@example.com`
        }
      });
      actualCustomerId = customer.id;
      console.log('✅ Backend - Cliente creado con ID:', actualCustomerId);
    } else {
      actualCustomerId = customer.id;
      console.log('✅ Backend - Usando cliente existente con ID:', actualCustomerId);
    }

    let user = await prisma.user.findUnique({ where: { id: devUserId } });
    if (!user) {
      const uniqueUsername = `devuser${Date.now()}`;
      const uniqueEmail = `dev${Date.now()}@example.com`;
      user = await prisma.user.create({
        data: {
          username: uniqueUsername,
          email: uniqueEmail,
          password: 'hashedpassword',
          firstName: 'Usuario',
          lastName: 'Desarrollo',
          role: 'ADMIN'
        }
      });
      // Usar el ID generado por Prisma
      devUserId = user.id;
    }

    // Generar un saleNumber único
    const saleNumber = `APARTADO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Crear la venta
    const tempSale = await prisma.sale.create({
      data: {
        saleNumber: saleNumber,
        customerId: actualCustomerId,
        userId: devUserId,
        subtotal: totalAmount,
        tax: 0,
        discount: 0,
        total: totalAmount,
        paymentMethod: 'CASH_USD',
        status: 'COMPLETED',
        notes: 'Venta generada automáticamente para apartado'
      }
    });

    // Crear el apartado
    const layaway = await prisma.layaway.create({
      data: {
        customerId: actualCustomerId,
        saleId: tempSale.id,
        amount: totalAmount,
        dueDate: new Date(dueDate),
        status: 'ACTIVO',
        notes: otherData.notes || 'Apartado creado desde desarrollo'
      }
    });

    // Crear el pago inicial si existe
    if (initialPayment && initialPayment > 0) {
      await prisma.layawayPayment.create({
        data: {
          layawayId: layaway.id,
          date: new Date(),
          amount: initialPayment,
          method: 'CASH_USD',
          notes: 'Pago inicial del apartado'
        }
      });
    }

    res.status(201).json({
      success: true,
      layaway: {
        ...layaway,
        sale: tempSale
      },
      message: 'Apartado creado exitosamente'
    });
  } catch (error) {
    console.error('Error creando apartado:', error);
    res.status(500).json({ success: false, error: 'Error al crear apartado', details: (error as Error).message });
  }
});

export default router;
export { testRouter };
