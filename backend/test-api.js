// Script simple para probar endpoints de la API
const http = require('http');

const testEndpoint = (path, method = 'GET', data = null) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        console.log(`\n=== ${method} ${path} ===`);
        console.log(`Status: ${res.statusCode}`);
        console.log(`Response:`, body);
        resolve({ status: res.statusCode, data: body });
      });
    });

    req.on('error', (err) => {
      console.error(`Error testing ${path}:`, err.message);
      reject(err);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
};

const runTests = async () => {
  console.log('🧪 Probando endpoints del BikeShop ERP Backend...\n');
  
  try {
    // Test de salud
    await testEndpoint('/api/health');
    
    // Test de productos
    await testEndpoint('/api/products');
    
    // Test de categorías
    await testEndpoint('/api/categories');
    
    // Test de clientes
    await testEndpoint('/api/customers');
    
    // Test de dashboard
    await testEndpoint('/api/dashboard/stats');
    
    console.log('\n✅ Todas las pruebas completadas!');
    
  } catch (error) {
    console.error('\n❌ Error en las pruebas:', error.message);
    console.log('\n💡 Asegúrate de que el servidor esté corriendo con: npm run dev');
  }
};

// Ejecutar pruebas
runTests();
