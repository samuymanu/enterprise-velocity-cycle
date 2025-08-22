import { productService } from './src/services/productService';

// Mock simple para verificar la estructura del servicio
describe('ProductService - Basic Structure', () => {
  
  it('should have all required methods', () => {
    expect(typeof productService.updateStockWithMovement).toBe('function');
    expect(typeof productService.getStockHistory).toBe('function');
    expect(typeof productService.calculateStockMetrics).toBe('function');
    expect(typeof productService.checkStockAlerts).toBe('function');
    expect(typeof productService.getProductsRequiringAttention).toBe('function');
    expect(typeof productService.optimizeStockLevels).toBe('function');
  });

  it('should be a singleton instance', () => {
    expect(productService).toBeDefined();
    expect(productService.constructor.name).toBe('ProductService');
  });
});
