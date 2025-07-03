// Script para verificar productos directamente
const http = require('http');

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

const checkProductsData = async () => {
  console.log('🔍 Verificando datos en el sistema...\n');
  
  try {
    // Login
    const loginResult = await makeRequest('/api/auth/login', 'POST', {
      identifier: 'admin@bikeshop.com',
      password: 'admin123'
    });
    
    const token = loginResult.data.token;
    console.log('✅ Login exitoso\n');

    // Verificar productos
    console.log('📦 Productos:');
    const productsResult = await makeRequest('/api/products', 'GET', null, token);
    console.log(`   Status: ${productsResult.status}`);
    if (productsResult.data && productsResult.data.products) {
      console.log(`   Cantidad: ${productsResult.data.products.length}`);
      productsResult.data.products.forEach((p, i) => {
        console.log(`   ${i+1}. ${p.name || 'Sin nombre'} (SKU: ${p.sku || 'N/A'}) - $${p.salePrice || 'N/A'}`);
      });
    } else {
      console.log(`   Respuesta: ${JSON.stringify(productsResult.data)}`);
    }

    // Verificar categorías 
    console.log('\n🏷️ Categorías:');
    const categoriesResult = await makeRequest('/api/categories', 'GET', null, token);
    console.log(`   Status: ${categoriesResult.status}`);
    console.log(`   Cantidad: ${Array.isArray(categoriesResult.data) ? categoriesResult.data.length : 'N/A'}`);

    // Verificar marcas
    console.log('\n🏭 Marcas:');
    const brandsResult = await makeRequest('/api/brands', 'GET', null, token);
    console.log(`   Status: ${brandsResult.status}`);
    console.log(`   Cantidad: ${Array.isArray(brandsResult.data) ? brandsResult.data.length : 'N/A'}`);

    // Verificar clientes
    console.log('\n👥 Clientes:');
    const customersResult = await makeRequest('/api/customers', 'GET', null, token);
    console.log(`   Status: ${customersResult.status}`);
    console.log(`   Cantidad: ${Array.isArray(customersResult.data) ? customersResult.data.length : 'N/A'}`);

    console.log('\n🎯 Resumen del inventario completo!');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
};

checkProductsData();
