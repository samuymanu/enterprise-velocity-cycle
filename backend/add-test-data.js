// Script para agregar productos de prueba
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

const addTestProducts = async () => {
  console.log('🏪 Agregando productos de prueba al BikeShop ERP...\n');
  
  try {
    // 1. Login
    const loginResult = await makeRequest('/api/auth/login', 'POST', {
      identifier: 'admin@bikeshop.com',
      password: 'admin123'
    });
    
    if (loginResult.status !== 200) {
      console.log('❌ Error en login:', loginResult.data);
      return;
    }
    
    const token = loginResult.data.token;
    console.log('✅ Login exitoso\n');

    // 2. Crear categorías primero
    console.log('🏷️ Creando categorías...');
    const categories = [
      { name: 'Bicicletas', description: 'Bicicletas completas' },
      { name: 'Componentes', description: 'Partes y componentes' },
      { name: 'Accesorios', description: 'Accesorios para ciclismo' }
    ];

    for (const category of categories) {
      const result = await makeRequest('/api/categories', 'POST', category, token);
      console.log(`   ${category.name}: Status ${result.status}`);
    }

    // 3. Crear marcas
    console.log('\n🏭 Creando marcas...');
    const brands = [
      { name: 'Trek', description: 'Bicicletas Trek' },
      { name: 'Shimano', description: 'Componentes Shimano' },
      { name: 'Specialized', description: 'Bicicletas Specialized' }
    ];

    for (const brand of brands) {
      const result = await makeRequest('/api/brands', 'POST', brand, token);
      console.log(`   ${brand.name}: Status ${result.status}`);
    }

    // 4. Obtener IDs de categorías y marcas
    const categoriesResult = await makeRequest('/api/categories', 'GET', null, token);
    const brandsResult = await makeRequest('/api/brands', 'GET', null, token);

    if (categoriesResult.status !== 200 || brandsResult.status !== 200) {
      console.log('❌ Error obteniendo categorías o marcas');
      return;
    }

    const categoryIds = categoriesResult.data;
    const brandIds = brandsResult.data;

    // 5. Crear productos
    console.log('\n📦 Creando productos...');
    const products = [
      {
        name: 'Trek Domane AL 2',
        description: 'Bicicleta de ruta para principiantes',
        sku: 'TRK-DOM-AL2',
        barcode: '123456789001',
        price: 899.99,
        cost: 650.00,
        stock: 5,
        minStock: 2,
        categoryId: categoryIds.find(c => c.name === 'Bicicletas')?.id,
        brandId: brandIds.find(b => b.name === 'Trek')?.id,
        status: 'ACTIVE'
      },
      {
        name: 'Shimano 105 Groupset',
        description: 'Grupo completo Shimano 105',
        sku: 'SHM-105-GRP',
        barcode: '123456789002',
        price: 599.99,
        cost: 420.00,
        stock: 3,
        minStock: 1,
        categoryId: categoryIds.find(c => c.name === 'Componentes')?.id,
        brandId: brandIds.find(b => b.name === 'Shimano')?.id,
        status: 'ACTIVE'
      },
      {
        name: 'Casco Specialized Align',
        description: 'Casco de seguridad para ciclismo',
        sku: 'SPZ-ALIGN-001',
        barcode: '123456789003',
        price: 49.99,
        cost: 30.00,
        stock: 15,
        minStock: 5,
        categoryId: categoryIds.find(c => c.name === 'Accesorios')?.id,
        brandId: brandIds.find(b => b.name === 'Specialized')?.id,
        status: 'ACTIVE'
      }
    ];

    for (const product of products) {
      const result = await makeRequest('/api/products', 'POST', product, token);
      console.log(`   ${product.name}: Status ${result.status}`);
      if (result.status !== 201) {
        console.log(`      Error: ${JSON.stringify(result.data)}`);
      }
    }

    // 6. Verificar productos creados
    console.log('\n✅ Verificando productos creados...');
    const finalProductsResult = await makeRequest('/api/products', 'GET', null, token);
    console.log(`📊 Total productos: ${finalProductsResult.data.length || 0}`);

    console.log('\n🎉 ¡Datos de prueba agregados exitosamente!');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
};

addTestProducts();
