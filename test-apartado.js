// Script de prueba para verificar la funcionalidad de apartados
const testApartadoCreation = async () => {
  try {
    console.log('🧪 Probando creación de apartado...');

    // Datos de prueba para un apartado
    const testApartadoData = {
      customerId: 'test-customer-id',
      saleId: 'test-sale-id',
      initialPayment: 50000, // 50.000 Bs
      totalAmount: 200000, // 200.000 Bs
      remainingAmount: 150000, // 150.000 Bs restante
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 días
      status: 'active',
      notes: 'Apartado de prueba desde script'
    };

    // Hacer petición al endpoint de creación de apartados
    const response = await fetch('http://localhost:3002/api/credits', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testApartadoData)
    });

    const result = await response.json();

    if (response.ok) {
      console.log('✅ Apartado creado exitosamente:', result);
      return result;
    } else {
      console.error('❌ Error al crear apartado:', result);
      return null;
    }
  } catch (error) {
    console.error('❌ Error en la prueba:', error);
    return null;
  }
};

// Ejecutar la prueba
testApartadoCreation();