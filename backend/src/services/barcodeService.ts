import { z } from 'zod';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Esquemas de validación
const createBarcodeSchema = z.object({
  productId: z.string().min(1, 'ID de producto es requerido'),
  format: z.string().default('CODE128'),
  type: z.string().default('PRODUCT'),
  isPrimary: z.boolean().default(false),
  metadata: z.record(z.string(), z.any()).optional()
});

const generateBarcodeSchema = z.object({
  productId: z.string().min(1, 'ID de producto es requerido'),
  format: z.string().default('CODE128'),
  type: z.string().default('PRODUCT')
});

export class BarcodeService {
  /**
   * Genera un código de barras único para un producto
   */
  async generateBarcode(data: z.infer<typeof generateBarcodeSchema> & { userId: string }) {
    try {
      const validatedData = generateBarcodeSchema.parse(data);

      // Generar código único basado en el formato
      const code = this.generateUniqueBarcode(validatedData.format, validatedData.productId);

      // Verificar que no exista
      const existing = await (prisma as any).barcode.findUnique({
        where: { code }
      });

      if (existing) {
        throw new Error('Código de barras ya existe, generando uno nuevo...');
      }

      // Verificar que el producto existe
      const product = await prisma.product.findUnique({
        where: { id: validatedData.productId }
      });

      if (!product) {
        throw new Error('Producto no encontrado');
      }

      // Si es primary, desmarcar otros barcodes del mismo producto
      if (validatedData.type === 'PRODUCT') {
        await (prisma as any).barcode.updateMany({
          where: {
            productId: validatedData.productId,
            type: 'PRODUCT',
            isPrimary: true
          },
          data: { isPrimary: false }
        });
      }

      // Crear registro en la base de datos
      const barcodeRecord = await (prisma as any).barcode.create({
        data: {
          productId: validatedData.productId,
          code,
          format: validatedData.format,
          type: validatedData.type,
          isPrimary: validatedData.type === 'PRODUCT', // El primer barcode de producto es primary
          createdBy: data.userId
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              salePrice: true,
              stock: true
            }
          },
          creator: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        }
      });

      return {
        success: true,
        barcode: barcodeRecord
      };

    } catch (error) {
      console.error('Error generando código de barras:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Busca un producto por código de barras
   */
  async scanBarcode(code: string) {
    try {
      if (!code || code.trim() === '') {
        throw new Error('Código de barras es requerido');
      }

      const barcodeRecord = await (prisma as any).barcode.findUnique({
        where: { code: code.trim() },
        include: {
          product: {
            include: {
              category: true,
              brand: true
            }
          }
        }
      });

      if (!barcodeRecord) {
        return {
          success: false,
          error: 'Código de barras no encontrado'
        };
      }

      if (!barcodeRecord.isActive) {
        return {
          success: false,
          error: 'Código de barras inactivo'
        };
      }

      return {
        success: true,
        product: barcodeRecord.product,
        barcode: {
          id: barcodeRecord.id,
          code: barcodeRecord.code,
          format: barcodeRecord.format,
          type: barcodeRecord.type,
          isPrimary: barcodeRecord.isPrimary
        }
      };

    } catch (error) {
      console.error('Error escaneando código de barras:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Obtiene todos los códigos de barras de un producto
   */
  async getProductBarcodes(productId: string) {
    try {
      const barcodes = await (prisma as any).barcode.findMany({
        where: { productId, isActive: true },
        include: {
          creator: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: [
          { isPrimary: 'desc' },
          { createdAt: 'desc' }
        ]
      });

      return {
        success: true,
        barcodes
      };

    } catch (error) {
      console.error('Error obteniendo códigos de barras del producto:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Desactiva un código de barras
   */
  async deactivateBarcode(barcodeId: string, userId: string) {
    try {
      const barcode = await (prisma as any).barcode.findUnique({
        where: { id: barcodeId }
      });

      if (!barcode) {
        throw new Error('Código de barras no encontrado');
      }

      await (prisma as any).barcode.update({
        where: { id: barcodeId },
        data: { isActive: false }
      });

      return {
        success: true,
        message: 'Código de barras desactivado exitosamente'
      };

    } catch (error) {
      console.error('Error desactivando código de barras:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Genera un código único basado en el formato
   */
  private generateUniqueBarcode(format: string, productId: string): string {
    const timestamp = Date.now().toString().slice(-6); // Últimos 6 dígitos del timestamp
    const productHash = this.hashString(productId).slice(0, 4); // Hash del productId

    switch (format) {
      case 'EAN13':
        return this.generateEAN13(productHash, timestamp);

      case 'UPC_A':
        return this.generateUPC(productHash, timestamp);

      case 'CODE128':
        return `BC${productHash}${timestamp}`;

      case 'QR_CODE':
        return `QR${productHash}${timestamp}${Math.random().toString(36).substring(2, 6)}`;

      default:
        return `${format}${productHash}${timestamp}`;
    }
  }

  /**
   * Genera código EAN13 válido
   */
  private generateEAN13(prefix: string, suffix: string): string {
    const base = (prefix + suffix).padEnd(12, '0').substring(0, 12);
    const checkDigit = this.calculateEAN13CheckDigit(base);
    return base + checkDigit;
  }

  /**
   * Genera código UPC válido
   */
  private generateUPC(prefix: string, suffix: string): string {
    const base = (prefix + suffix).padEnd(11, '0').substring(0, 11);
    const checkDigit = this.calculateUPCCheckDigit(base);
    return base + checkDigit;
  }

  /**
   * Calcula dígito de control EAN13
   */
  private calculateEAN13CheckDigit(code: string): number {
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const digit = parseInt(code[i]);
      sum += i % 2 === 0 ? digit : digit * 3;
    }
    const remainder = sum % 10;
    return remainder === 0 ? 0 : 10 - remainder;
  }

  /**
   * Calcula dígito de control UPC
   */
  private calculateUPCCheckDigit(code: string): number {
    let sum = 0;
    for (let i = 0; i < 11; i++) {
      const digit = parseInt(code[i]);
      sum += i % 2 === 0 ? digit * 3 : digit;
    }
    const remainder = sum % 10;
    return remainder === 0 ? 0 : 10 - remainder;
  }

  /**
   * Genera un hash simple de string
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convertir a 32 bits
    }
    return Math.abs(hash).toString(16);
  }
}

// Exportar instancia singleton
export const barcodeService = new BarcodeService();