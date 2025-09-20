import { Router } from 'express';
import { barcodeService } from '../services/barcodeService';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Aplicar middleware de autenticación a todas las rutas
router.use(authMiddleware);

/**
 * POST /api/barcodes/generate
 * Genera un código de barras para un producto
 */
router.post('/generate', async (req, res) => {
  try {
    const { productId, format = 'CODE128' } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        error: 'ID de producto es requerido'
      });
    }

    const result = await barcodeService.generateBarcode({
      productId,
      format,
      type: 'PRODUCT',
      userId: req.user?.id || ''
    });

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }

  } catch (error) {
    console.error('Error en POST /api/barcodes/generate:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

/**
 * GET /api/barcodes/scan/:barcode
 * Escanea un código de barras y retorna el producto
 */
router.get('/scan/:barcode', async (req, res) => {
  try {
    const { barcode } = req.params;

    if (!barcode) {
      return res.status(400).json({
        success: false,
        error: 'Código de barras es requerido'
      });
    }

    const result = await barcodeService.scanBarcode(barcode);

    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }

  } catch (error) {
    console.error('Error en GET /api/barcodes/scan:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

/**
 * GET /api/barcodes/product/:productId
 * Obtiene todos los códigos de barras de un producto
 */
router.get('/product/:productId', async (req, res) => {
  try {
    const { productId } = req.params;

    if (!productId) {
      return res.status(400).json({
        success: false,
        error: 'ID de producto es requerido'
      });
    }

    const result = await barcodeService.getProductBarcodes(productId);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }

  } catch (error) {
    console.error('Error en GET /api/barcodes/product:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

/**
 * PUT /api/barcodes/:barcodeId/deactivate
 * Desactiva un código de barras
 */
router.put('/:barcodeId/deactivate', async (req, res) => {
  try {
    const { barcodeId } = req.params;

    if (!barcodeId) {
      return res.status(400).json({
        success: false,
        error: 'ID de código de barras es requerido'
      });
    }

    const result = await barcodeService.deactivateBarcode(barcodeId, req.user?.id || '');

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }

  } catch (error) {
    console.error('Error en PUT /api/barcodes/deactivate:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

/**
 * POST /api/barcodes/custom
 * Crea un código de barras personalizado
 */
router.post('/custom', async (req, res) => {
  try {
    const { productId, format = 'CODE128', type = 'PRODUCT', isPrimary = false, metadata } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        error: 'ID de producto es requerido'
      });
    }

    const result = await barcodeService.generateBarcode({
      productId,
      format,
      type,
      userId: req.user?.id || ''
    });

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }

  } catch (error) {
    console.error('Error en POST /api/barcodes/custom:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

/**
 * GET /api/barcodes/stats
 * Obtiene estadísticas de códigos de barras
 * TODO: Implementar método getBarcodeStats en el servicio
 */
router.get('/stats', async (req, res) => {
  try {
    // const result = await barcodeService.getBarcodeStats();
    // Por ahora retornamos estadísticas básicas
    res.json({
      success: true,
      stats: {
        message: 'Estadísticas no implementadas aún'
      }
    });

  } catch (error) {
    console.error('Error en GET /api/barcodes/stats:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

export default router;