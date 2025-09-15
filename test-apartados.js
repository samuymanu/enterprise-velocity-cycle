// Script de prueba completo para verificar apartados
// Ejecuta esto en la consola del navegador (F12 → Console)

// Función para probar el endpoint directamente
async function testDirectEndpoint() {
  const customerId = 'cmfh7ujnb000011eb7k7jj51k';

  console.log('🧪 Probando endpoint directo...');
  console.log('📋 Customer ID:', customerId);

  try {
    const response = await fetch(`http://localhost:3002/api/test-credits/${customerId}`);
    const data = await response.json();

    console.log('📥 Respuesta directa del backend:', data);
    console.log('� Número de apartados:', data.layaways ? data.layaways.length : 0);

    return data;
  } catch (error) {
    console.error('❌ Error en petición directa:', error);
    return null;
  }
}

// Función para probar el endpoint a través del proxy
async function testProxyEndpoint() {
  const customerId = 'cmfh7ujnb000011eb7k7jj51k';

  console.log('🧪 Probando endpoint a través del proxy...');

  try {
    const response = await fetch(`/api/test-credits/${customerId}`);
    const data = await response.json();

    console.log('📥 Respuesta a través del proxy:', data);
    console.log('📊 Número de apartados:', data.layaways ? data.layaways.length : 0);

    return data;
  } catch (error) {
    console.error('❌ Error en petición proxy:', error);
    return null;
  }
}

// Función para simular la lógica del frontend
function simulateFrontendLogic(response) {
  console.log('🧪 Simulando lógica del frontend...');

  const credits = response.layaways || response.data || response || [];
  console.log('📋 Credits procesados:', credits);
  console.log('📊 Es array:', Array.isArray(credits));
  console.log('📊 Longitud:', credits.length);

  if (Array.isArray(credits) && credits.length > 0) {
    console.log('✅ Frontend mostraría los apartados');
    credits.forEach((apartado, index) => {
      console.log(`📋 Apartado ${index + 1}:`, {
        id: apartado.id,
        amount: apartado.amount,
        status: apartado.status,
        customerId: apartado.customerId
      });
    });
  } else {
    console.log('❌ Frontend mostraría "No hay apartados"');
  }

  return credits;
}

// Función principal de prueba
async function runFullTest() {
  console.log('🚀 Iniciando prueba completa de apartados...\n');

  // 1. Probar endpoint directo
  const directData = await testDirectEndpoint();
  console.log('\n' + '='.repeat(50) + '\n');

  // 2. Probar endpoint a través del proxy
  const proxyData = await testProxyEndpoint();
  console.log('\n' + '='.repeat(50) + '\n');

  // 3. Simular lógica del frontend
  if (proxyData) {
    const processedCredits = simulateFrontendLogic(proxyData);
    console.log('\n' + '='.repeat(50) + '\n');

    // 4. Comparar resultados
    console.log('📊 COMPARACIÓN DE RESULTADOS:');
    console.log('Directo - Success:', directData?.success);
    console.log('Directo - Layaways:', directData?.layaways?.length || 0);
    console.log('Proxy - Success:', proxyData?.success);
    console.log('Proxy - Layaways:', proxyData?.layaways?.length || 0);
    console.log('Procesados - Array:', Array.isArray(processedCredits));
    console.log('Procesados - Longitud:', processedCredits.length);
  }
}

// Ejecutar la prueba completa
runFullTest();