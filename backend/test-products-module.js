// Script para probar autenticación y módulo de productos
const http = require('http');

// Función helper para hacer requests
const makeRequest = (path, method = 'GET', data = null, token = null) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', (err) => reject(err));
    
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
};

const testProductsModule = async () => {
  console.log('🧪 Probando Módulo de PRODUCTOS del BikeShop ERP...\n');
  
  try {
    // 1. Intentar acceder a productos sin token (debe fallar)
    console.log('📋 1. Probando acceso sin autenticación...');
    const noAuthResult = await makeRequest('/api/products');
    console.log(`   Status: ${noAuthResult.status}`);
    console.log(`   Response: ${JSON.stringify(noAuthResult.data)}\n`);

    // 2. Hacer login con el usuario admin del seed
    console.log('🔐 2. Haciendo login...');
    const loginResult = await makeRequest('/api/auth/login', 'POST', {
      identifier: 'admin@bikeshop.com',
      password: 'admin123'
    });
    console.log(`   Status: ${loginResult.status}`);
    
    if (loginResult.status !== 200) {
      console.log(`   ❌ Error en login: ${JSON.stringify(loginResult.data)}`);
      return;
    }
    
    const token = loginResult.data.token;
    console.log(`   ✅ Login exitoso! Token obtenido.\n`);

    // 3. Obtener productos con autenticación
    console.log('📦 3. Obteniendo productos con autenticación...');
    const productsResult = await makeRequest('/api/products', 'GET', null, token);
    console.log(`   Status: ${productsResult.status}`);
    
    if (productsResult.status === 200) {
      console.log(`   ✅ Productos obtenidos: ${productsResult.data.length || 0} productos encontrados`);
      if (productsResult.data.length > 0) {
        console.log(`   📝 Primer producto: ${productsResult.data[0].name || 'N/A'}`);
      }
    } else {
      console.log(`   ❌ Error: ${JSON.stringify(productsResult.data)}`);
    }

    console.log('\n🎉 Prueba del módulo de productos completada!');
    
  } catch (error) {
    console.error('\n❌ Error en las pruebas:', error.message);
  }
};

// Ejecutar pruebas
testProductsModule();
