import express from 'express';
import { PrismaClient } from '@prisma/client';
import { validateBody } from '../middleware/validation';
import { createCustomerSchema, updateCustomerSchema } from '../schemas/customer';
import { authMiddleware } from '../middleware/auth';
import multer from 'multer';
import { parse } from 'csv-parse/sync';

const router = express.Router();
const testRouter = express.Router(); // Router sin autenticación para pruebas
router.use(authMiddleware);
const prisma = new PrismaClient();
const upload = multer({ limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB limit

// Ruta temporal sin autenticación para pruebas
testRouter.get('/test-customers', async (req, res) => {
  try {
    const { page = '1', limit = '20', search = '' } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const where = search ? {
      OR: [
        { firstName: { contains: search as string, mode: 'insensitive' as const } },
        { lastName: { contains: search as string, mode: 'insensitive' as const } },
        { email: { contains: search as string, mode: 'insensitive' as const } },
        { phone: { contains: search as string, mode: 'insensitive' as const } },
        { documentNumber: { contains: search as string, mode: 'insensitive' as const } }
      ]
    } : {};

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.customer.count({ where })
    ]);

    const totalPages = Math.ceil(total / limitNum);

    res.json({
      success: true,
      customers,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages
      }
    });
  } catch (error) {
    console.error('Error obteniendo clientes:', error);
    res.status(500).json({ success: false, error: 'Error al obtener clientes' });
  }
});

// GET /api/customers - Obtener lista de clientes
router.get('/', async (req, res) => {
  try {
    const { page = '1', limit = '20', search = '' } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const where = search ? {
      OR: [
        { firstName: { contains: search as string, mode: 'insensitive' as const } },
        { lastName: { contains: search as string, mode: 'insensitive' as const } },
        { email: { contains: search as string, mode: 'insensitive' as const } },
        { phone: { contains: search as string, mode: 'insensitive' as const } },
        { documentNumber: { contains: search as string, mode: 'insensitive' as const } }
      ]
    } : {};

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.customer.count({ where })
    ]);

    const totalPages = Math.ceil(total / limitNum);

    res.json({
      success: true,
      customers,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages
      }
    });
  } catch (error: any) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ success: false, error: 'Error al obtener clientes' });
  }
});

// POST /api/customers - Crear cliente
router.post('/', validateBody(createCustomerSchema), async (req, res) => {
  try {
    console.log('Creating customer with data:', req.body);
    const customer = await prisma.customer.create({ data: req.body });
    console.log('Customer created successfully:', customer.id);
    res.status(201).json({ success: true, customer });
  } catch (error: any) {
    console.error('Error creating customer:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error al crear cliente',
      details: error.message
    });
  }
});

// POST /api/customers/import - Importar CSV de clientes
router.post('/import', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'Archivo no proporcionado' });

    const text = req.file.buffer.toString('utf8');
    const records = parse(text, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    }) as Record<string, any>[];

    const results: { imported: number; updated: number; errors: any[] } = { imported: 0, updated: 0, errors: [] };

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      // Mapear y normalizar campos mínimos
      const payload: any = {
        documentType: (row.documentType || 'CI').toString().toUpperCase(),
        documentNumber: (row.documentNumber || '').toString(),
        firstName: row.firstName || null,
        lastName: row.lastName || null,
        companyName: row.companyName || null,
        customerType: (row.customerType || 'INDIVIDUAL').toString().toUpperCase(),
        phone: row.phone || null,
        email: row.email || null,
        address: row.address || null,
        city: row.city || null,
        state: row.state || null,
        country: row.country || 'Venezuela',
        isActive: row.isActive === undefined ? true : (row.isActive.toString().toLowerCase() === 'true' || row.isActive === '1'),
        notes: row.notes || null
      };

      // Validaciones básicas
      if (!payload.documentNumber) {
        results.errors.push({ row: i + 1, message: 'documentNumber es requerido' });
        continue;
      }

      try {
        // Upsert por documentNumber (documentType+documentNumber no es unique en prisma, usar documentNumber solo)
        const existing = await prisma.customer.findUnique({ where: { documentNumber: payload.documentNumber } });
        if (existing) {
          await prisma.customer.update({ where: { id: existing.id }, data: payload });
          results.updated += 1;
        } else {
          await prisma.customer.create({ data: payload });
          results.imported += 1;
        }
      } catch (err: any) {
        results.errors.push({ row: i + 1, message: err.message || 'Error al procesar fila' });
      }
    }

    res.json({ success: true, ...results });
  } catch (error: any) {
    console.error('Import customers error:', error);
    res.status(500).json({ success: false, error: 'Error al importar clientes' });
  }
});

// GET /api/customers/export - Exportar CSV de clientes
router.get('/export', async (req, res) => {
  try {
    const customers = await prisma.customer.findMany({ orderBy: { createdAt: 'desc' } });
    const columns = [
      'documentType','documentNumber','firstName','lastName','companyName','customerType','phone','email','address','city','state','country','isActive','notes'
    ];

    const records = customers.map(c => ({
      documentType: c.documentType,
      documentNumber: c.documentNumber,
      firstName: c.firstName || '',
      lastName: c.lastName || '',
      companyName: c.companyName || '',
      customerType: c.customerType,
      phone: c.phone || '',
      email: c.email || '',
      address: c.address || '',
      city: c.city || '',
      state: c.state || '',
      country: c.country || '',
      isActive: c.isActive ? 'true' : 'false',
      notes: c.notes || ''
    }));

    // generar CSV simple (escapando comillas dobles)
    const escapeValue = (v: any) => {
      if (v === null || v === undefined) return '';
      return '"' + String(v).replace(/"/g, '""') + '"';
    };

    const headerLine = columns.join(',');
    const lines = records.map((r) => {
      const vals = [
        r.documentType,
        r.documentNumber,
        r.firstName,
        r.lastName,
        r.companyName,
        r.customerType,
        r.phone,
        r.email,
        r.address,
        r.city,
        r.state,
        r.country,
        r.isActive,
        r.notes
      ];
      return vals.map(v => escapeValue(v)).join(',');
    });

    const csv = [headerLine, ...lines].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="customers-export.csv"');
    res.send(csv);
  } catch (error: any) {
    console.error('Export customers error:', error);
    res.status(500).json({ success: false, error: 'Error al exportar clientes' });
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
export { testRouter };
