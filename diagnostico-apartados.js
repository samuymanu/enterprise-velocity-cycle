// Script completo de diagnóstico para apartados
// Ejecuta esto en la consola del navegador (F12 → Console)

// Función para verificar conectividad del backend
async function checkBackendHealth() {
  console.log('🏥 Verificando estado del backend...');

  try {
    const response = await fetch('http://localhost:3002/api/health');
    const data = await response.json();

    console.log('✅ Backend responde:', data);
    return true;
  } catch (error) {
    console.error('❌ Backend no responde:', error);
    return false;
  }
}

// Función para buscar cliente por nombre
async function findCustomerByName(firstName, lastName) {
  console.log(`🔍 Buscando cliente: ${firstName} ${lastName}`);

  try {
    const response = await fetch('/api/test-customers');
    const data = await response.json();

    const customer = data.customers.find(c =>
      c.firstName.toLowerCase() === firstName.toLowerCase() &&
      c.lastName.toLowerCase() === lastName.toLowerCase()
    );

    if (customer) {
      console.log('✅ Cliente encontrado:', customer);
      return customer;
    } else {
      console.log('❌ Cliente no encontrado');
      return null;
    }
  } catch (error) {
    console.error('❌ Error al buscar cliente:', error);
    return null;
  }
}

// Función para verificar apartados de un cliente
async function checkCustomerLayaways(customerId, customerName) {
  console.log(`📋 Verificando apartados para ${customerName} (ID: ${customerId})`);

  try {
    const response = await fetch(`/api/test-credits/${customerId}`);
    const data = await response.json();

    console.log('📊 Resultado de consulta de apartados:', data);

    if (data.success && data.layaways) {
      console.log(`✅ Apartados encontrados: ${data.layaways.length}`);
      if (data.layaways.length > 0) {
        data.layaways.forEach((apartado, index) => {
          console.log(`📋 Apartado ${index + 1}:`, {
            id: apartado.id,
            amount: apartado.amount,
            status: apartado.status,
            createdAt: apartado.createdAt,
            sale: apartado.sale ? apartado.sale.saleNumber : 'Sin venta'
          });
        });
      }
      return data.layaways;
    } else {
      console.log('❌ Error en respuesta o sin apartados');
      return [];
    }
  } catch (error) {
    console.error('❌ Error al consultar apartados:', error);
    return [];
  }
}

// Función para verificar todos los apartados existentes
async function checkAllLayaways() {
  console.log('📊 Verificando todos los apartados existentes...');

  try {
    // Obtener todos los clientes
    const customersResponse = await fetch('/api/test-customers');
    const customersData = await customersResponse.json();

    console.log(`👥 Total de clientes: ${customersData.customers.length}`);

    let totalApartados = 0;

    // Verificar apartados para cada cliente
    for (const customer of customersData.customers) {
      try {
        const layawaysResponse = await fetch(`/api/test-credits/${customer.id}`);
        const layawaysData = await layawaysResponse.json();

        if (layawaysData.success && layawaysData.layaways && layawaysData.layaways.length > 0) {
          console.log(`✅ ${customer.firstName} ${customer.lastName}: ${layawaysData.layaways.length} apartado(s)`);
          totalApartados += layawaysData.layaways.length;

          layawaysData.layaways.forEach(apartado => {
            console.log(`   📋 ID: ${apartado.id}, Monto: ${apartado.amount}, Estado: ${apartado.status}`);
          });
        }
      } catch (error) {
        // Ignorar errores individuales
      }
    }

    console.log(`📊 Total de apartados en el sistema: ${totalApartados}`);
    return totalApartados;

  } catch (error) {
    console.error('❌ Error al verificar todos los apartados:', error);
    return 0;
  }
}

// Función principal de diagnóstico
async function runCompleteDiagnosis() {
  console.log('🚀 Iniciando diagnóstico completo de apartados...\n');

  // 1. Verificar backend
  const backendOk = await checkBackendHealth();
  console.log('\n' + '='.repeat(60) + '\n');

  if (!backendOk) {
    console.error('❌ DIAGNÓSTICO INTERRUMPIDO: Backend no funciona');
    return;
  }

  // 2. Buscar cliente Samuel Olivares
  const samuel = await findCustomerByName('Samuel', 'Olivares');
  console.log('\n' + '='.repeat(60) + '\n');

  // 3. Verificar apartados de Samuel
  if (samuel) {
    await checkCustomerLayaways(samuel.id, 'Samuel Olivares');
    console.log('\n' + '='.repeat(60) + '\n');
  }

  // 4. Verificar todos los apartados del sistema
  const totalApartados = await checkAllLayaways();
  console.log('\n' + '='.repeat(60) + '\n');

  // 5. Resumen final
  console.log('📋 RESUMEN DEL DIAGNÓSTICO:');
  console.log(`🔗 Backend: ${backendOk ? '✅ Funcionando' : '❌ Error'}`);
  console.log(`👤 Samuel Olivares: ${samuel ? '✅ Encontrado (ID: ' + samuel.id + ')' : '❌ No encontrado'}`);
  console.log(`📊 Total apartados en sistema: ${totalApartados}`);

  if (samuel && totalApartados > 0) {
    console.log('\n💡 RECOMENDACIONES:');
    console.log('1. Si Samuel tiene apartados → El sistema funciona correctamente');
    console.log('2. Si Samuel no tiene apartados → Revisar el proceso de creación');
    console.log('3. Si hay apartados en otros clientes → Verificar selección de cliente en POS');
  }
}

// Ejecutar diagnóstico completo
runCompleteDiagnosis();