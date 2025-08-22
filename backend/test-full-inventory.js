const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const BASE_URL = 'http://localhost:3001/api';

async function testInventoryModule() {
  console.log('🧪 ANÁLISIS COMPLETO DEL MÓDULO DE INVENTARIO');
  console.log('=' * 60);
  
  try {
    // 1. Login
    console.log('\n🔑 1. AUTENTICACIÓN');
    const loginResponse = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'admin@bikeshop.com',
        password: 'admin123'
      })
    });
    
    const loginData = await loginResponse.json();
    if (!loginResponse.ok) {
      console.log('❌ Error en login:', loginData);
      return;
    }
    
    const token = loginData.token;
    console.log('✅ Login exitoso');
    
    const authHeaders = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // 2. Test Categorías
    console.log('\n📁 2. CATEGORÍAS');
    console.log('-'.repeat(30));
    
    const categoriesResponse = await fetch(`${BASE_URL}/categories`, {
      headers: authHeaders
    });
    const categoriesData = await categoriesResponse.json();
    console.log(`   Status: ${categoriesResponse.status}`);
    console.log(`   Datos:`, categoriesData);

    // 3. Test Atributos
    console.log('\n🏷️ 3. ATRIBUTOS');
    console.log('-'.repeat(30));
    
    const attributesResponse = await fetch(`${BASE_URL}/attributes`, {
      headers: authHeaders
    });
    const attributesData = await attributesResponse.json();
    console.log(`   Status: ${attributesResponse.status}`);
    console.log(`   Datos:`, attributesData);

    // 4. Test Productos
    console.log('\n📦 4. PRODUCTOS');
    console.log('-'.repeat(30));
    
    const productsResponse = await fetch(`${BASE_URL}/products`, {
      headers: authHeaders
    });
    const productsData = await productsResponse.json();
    console.log(`   Status: ${productsResponse.status}`);
    console.log(`   Datos:`, productsData);

    // 5. Test Brands
    console.log('\n🏭 5. MARCAS');
    console.log('-'.repeat(30));
    
    const brandsResponse = await fetch(`${BASE_URL}/brands`, {
      headers: authHeaders
    });
    const brandsData = await brandsResponse.json();
    console.log(`   Status: ${brandsResponse.status}`);
    console.log(`   Datos:`, brandsData);

    // 6. Test creación de atributo
    console.log('\n➕ 6. CREAR ATRIBUTO TEST');
    console.log('-'.repeat(30));
    
    const createAttrResponse = await fetch(`${BASE_URL}/attributes`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        name: 'Color Test',
        type: 'LIST',
        options: ['Rojo', 'Azul', 'Verde'],
        description: 'Color del producto',
        isActive: true
      })
    });
    const createAttrData = await createAttrResponse.json();
    console.log(`   Status: ${createAttrResponse.status}`);
    console.log(`   Datos:`, createAttrData);

    // 7. Test creación de categoría
    console.log('\n➕ 7. CREAR CATEGORÍA TEST');
    console.log('-'.repeat(30));
    
    const createCatResponse = await fetch(`${BASE_URL}/categories`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        name: 'Categoría Test Analysis',
        description: 'Categoría para análisis'
      })
    });
    const createCatData = await createCatResponse.json();
    console.log(`   Status: ${createCatResponse.status}`);
    console.log(`   Datos:`, createCatData);

    console.log('\n✅ ANÁLISIS COMPLETADO');
    
  } catch (error) {
    console.error('❌ Error en análisis:', error);
  }
}

testInventoryModule();
