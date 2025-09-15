// Script de verificación exhaustiva de la funcionalidad de apartados
const BASE_URL = 'http://localhost:3002/api';

async function testEndpoint(url, method = 'GET', body = null) {
  try {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (body) options.body = JSON.stringify(body);

    const response = await fetch(url, options);
    const data = await response.json();

    return {
      success: response.ok,
      status: response.status,
      data,
      url
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      url
    };
  }
}

async function runComprehensiveTests() {
  console.log('🧪 Iniciando verificación exhaustiva de apartados...\n');

  // 1. Verificar que el backend esté respondiendo
  console.log('1️⃣ Verificando estado del backend...');
  const healthCheck = await testEndpoint(`${BASE_URL}/health`);
  console.log(`   Health Check: ${healthCheck.success ? '✅ OK' : '❌ FAIL'}`);
  if (!healthCheck.success) {
    console.error('   Error:', healthCheck.error);
    return;
  }

  // 2. Verificar que las rutas de créditos estén disponibles
  console.log('\n2️⃣ Verificando rutas de créditos...');
  const creditsTest = await testEndpoint(`${BASE_URL}/test-credits/test-customer`);
  console.log(`   Créditos endpoint: ${creditsTest.success ? '✅ OK' : '❌ FAIL'}`);

  // 3. Verificar que se puedan crear apartados
  console.log('\n3️⃣ Probando creación de apartados...');
  const testApartado = {
    customerId: 'test-customer-123',
    saleId: 'test-sale-456',
    initialPayment: 25000,
    totalAmount: 100000,
    remainingAmount: 75000,
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'active',
    notes: 'Apartado de prueba automatizada'
  };

  const createResult = await testEndpoint(`${BASE_URL}/credits`, 'POST', testApartado);
  console.log(`   Crear apartado: ${createResult.success ? '✅ OK' : '❌ FAIL'}`);

  if (createResult.success) {
    console.log(`   Apartado creado con ID: ${createResult.data?.layaway?.id || 'N/A'}`);
  } else {
    console.error('   Error al crear apartado:', createResult.data);
  }

  // 4. Verificar que se puedan obtener apartados
  console.log('\n4️⃣ Verificando obtención de apartados...');
  const getCredits = await testEndpoint(`${BASE_URL}/test-credits/test-customer-123`);
  console.log(`   Obtener apartados: ${getCredits.success ? '✅ OK' : '❌ FAIL'}`);

  if (getCredits.success && getCredits.data) {
    const apartados = getCredits.data.layaways || getCredits.data;
    console.log(`   Número de apartados encontrados: ${Array.isArray(apartados) ? apartados.length : 0}`);
  }

  // 5. Verificar rutas de productos (para validar inventario)
  console.log('\n5️⃣ Verificando sistema de productos...');
  const productsTest = await testEndpoint(`${BASE_URL}/products`);
  console.log(`   Productos endpoint: ${productsTest.success ? '✅ OK' : '❌ FAIL'}`);

  // 6. Verificar rutas de ventas
  console.log('\n6️⃣ Verificando sistema de ventas...');
  const salesTest = await testEndpoint(`${BASE_URL}/sales`);
  console.log(`   Ventas endpoint: ${salesTest.success ? '✅ OK' : '❌ FAIL'}`);

  console.log('\n🎯 Verificación completada!');
  console.log('\n📋 Resumen:');
  console.log(`   Backend: ${healthCheck.success ? '✅' : '❌'}`);
  console.log(`   Créditos: ${creditsTest.success ? '✅' : '❌'}`);
  console.log(`   Crear Apartado: ${createResult.success ? '✅' : '❌'}`);
  console.log(`   Obtener Apartados: ${getCredits.success ? '✅' : '❌'}`);
  console.log(`   Productos: ${productsTest.success ? '✅' : '❌'}`);
  console.log(`   Ventas: ${salesTest.success ? '✅' : '❌'}`);
}

// Ejecutar las pruebas
runComprehensiveTests().catch(console.error);