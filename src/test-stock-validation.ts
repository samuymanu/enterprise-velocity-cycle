import { apiService } from './lib/api';
import { useInventoryStore } from './stores/inventoryStore';

/**
 * Test script para validar la funcionalidad de stock en tiempo real
 */
export async function testStockValidation() {
  console.log('🧪 Iniciando pruebas de validación de stock...');

  try {
    // 1. Verificar que el inventory store se carga correctamente
    console.log('📦 Verificando inventory store...');
    let products = useInventoryStore.getState().products;
    console.log(`📦 Productos cargados inicialmente: ${products.length}`);

    if (products.length === 0) {
      console.log('⚠️  No hay productos en el store, intentando cargar...');
      await useInventoryStore.getState().fetchProducts();
      products = useInventoryStore.getState().products;
      console.log(`📦 Productos después de carga: ${products.length}`);
    }

    if (products.length === 0) {
      console.log('❌ No se pudieron cargar productos. Verifica la conexión con el backend.');
      return;
    }

    // 2. Probar obtener productos por ID
    console.log('🔍 Probando getProductById...');
    const testProduct = products[0];
    if (testProduct) {
      console.log(`🔍 Producto de prueba: ${testProduct.name} (ID: ${testProduct.id})`);
      const found = useInventoryStore.getState().getProductById(testProduct.id);
      console.log(`🔍 Producto encontrado: ${found ? found.name : 'No encontrado'}`);
      console.log(`📊 Stock disponible: ${found?.stock || 0}`);
      console.log(`📊 Stock mínimo: ${found?.minStock || 0}`);
      console.log(`💰 Precio: ${found?.salePrice || 'No disponible'}`);
    }

    // 3. Simular validación de stock
    console.log('✅ Simulando validación de stock...');
    if (testProduct) {
      const availableStock = testProduct.stock || 0;
      const minStock = testProduct.minStock || 0;
      const requestedQuantity = 5;

      console.log(`📊 Estado del stock:`);
      console.log(`   - Disponible: ${availableStock}`);
      console.log(`   - Mínimo: ${minStock}`);
      console.log(`   - Solicitado: ${requestedQuantity}`);

      if (availableStock === 0) {
        console.log('❌ SIN STOCK: El producto no tiene unidades disponibles');
      } else if (availableStock < requestedQuantity) {
        console.log(`❌ STOCK INSUFICIENTE: ${availableStock} disponible, ${requestedQuantity} solicitados`);
      } else if (availableStock <= minStock) {
        console.log(`⚠️ STOCK BAJO: ${availableStock} disponible (mínimo: ${minStock})`);
      } else {
        console.log(`✅ STOCK SUFICIENTE: ${availableStock} disponible`);
      }
    }

    // 4. Probar búsqueda por SKU si existe
    if (testProduct.sku) {
      console.log('🔍 Probando búsqueda por SKU...');
      const productsBySku = products.filter(p => p.sku === testProduct.sku);
      console.log(`🔍 Productos encontrados con SKU ${testProduct.sku}: ${productsBySku.length}`);
    }

    // 5. Mostrar resumen de productos con stock bajo
    const lowStockProducts = products.filter(p => (p.stock || 0) <= (p.minStock || 0) && (p.stock || 0) > 0);
    const outOfStockProducts = products.filter(p => (p.stock || 0) === 0);

    console.log('📊 Resumen de inventario:');
    console.log(`   - Total productos: ${products.length}`);
    console.log(`   - Stock bajo: ${lowStockProducts.length}`);
    console.log(`   - Sin stock: ${outOfStockProducts.length}`);

    if (lowStockProducts.length > 0) {
      console.log('⚠️ Productos con stock bajo:');
      lowStockProducts.slice(0, 3).forEach(p => {
        console.log(`   - ${p.name}: ${p.stock} disponible (mín: ${p.minStock})`);
      });
    }

    console.log('🎉 Pruebas completadas exitosamente');

  } catch (error) {
    console.error('❌ Error en pruebas:', error);
  }
}

// Función para simular selección de producto (como lo haría el POS)
export async function simulateProductSelection(productId: string, quantity: number = 1) {
  console.log(`🛒 Simulando selección de producto: ${productId}, cantidad: ${quantity}`);

  try {
    const product = useInventoryStore.getState().getProductById(productId);

    if (!product) {
      console.log('❌ Producto no encontrado');
      return false;
    }

    const availableStock = product.stock || 0;
    console.log(`📊 Stock disponible: ${availableStock}`);
    console.log(`📊 Cantidad solicitada: ${quantity}`);

    if (availableStock < quantity) {
      if (availableStock === 0) {
        console.log('❌ PRODUCTO SIN STOCK - No se puede agregar al carrito');
        return false;
      } else {
        console.log(`❌ STOCK INSUFICIENTE - Solo ${availableStock} disponible, ${quantity} solicitados`);
        return false;
      }
    }

    console.log('✅ Producto agregado al carrito exitosamente');
    return true;

  } catch (error) {
    console.error('❌ Error simulando selección:', error);
    return false;
  }
}

// Ejecutar pruebas si se llama directamente
if (typeof window !== 'undefined') {
  // En el navegador, agregar funciones globales para testing
  (window as any).testStockValidation = testStockValidation;
  (window as any).simulateProductSelection = simulateProductSelection;
}