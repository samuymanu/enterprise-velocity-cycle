#!/usr/bin/env node

/**
 * Script para probar la creación de productos
 */

const FormData = require('form-data');
const { default: fetch } = require('node-fetch');

async function testCreateProduct() {
  console.log('🧪 Testing product creation...');
  
  try {
    // 1. Autenticar
    console.log('🔐 Authenticating...');
    const authResponse = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        identifier: 'admin@bikeshop.com',
        password: 'DevAdmin@2025!'
      })
    });
    
    if (!authResponse.ok) {
      throw new Error(`Auth failed: ${authResponse.status}`);
    }
    
    const authData = await authResponse.json();
    const token = authData.token;
    console.log('✅ Authentication successful');
    
    // 2. Obtener categorías
    console.log('📂 Getting categories...');
    const categoriesResponse = await fetch('http://localhost:3001/api/categories', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const categoriesData = await categoriesResponse.json();
    const mtbCategory = categoriesData.categories.find(cat => cat.code === 'MTB');
    
    if (!mtbCategory) {
      throw new Error('Mountain Bike category not found');
    }
    
    console.log(`✅ Found MTB category: ${mtbCategory.id}`);
    
    // 3. Obtener marcas
    console.log('🏷️ Getting brands...');
    const brandsResponse = await fetch('http://localhost:3001/api/brands', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const brandsData = await brandsResponse.json();
    const testBrand = brandsData.brands[0];
    
    if (!testBrand) {
      throw new Error('No brands found');
    }
    
    console.log(`✅ Found brand: ${testBrand.name} (${testBrand.id})`);
    
    // 4. Crear producto
    console.log('📦 Creating product...');
    const formData = new FormData();
    
    formData.append('name', 'Mountain Bike Test API');
    formData.append('description', 'Bicicleta de montaña creada desde API test');
    formData.append('categoryId', mtbCategory.id);
    formData.append('brand', testBrand.name);
    formData.append('costPrice', '800');
    formData.append('salePrice', '1200');
    formData.append('stock', '5');
    formData.append('minStock', '2');
    formData.append('sku', 'MTB-API-TEST-001');
    formData.append('barcode', 'MTB-API-TEST-001');
    
    const productResponse = await fetch('http://localhost:3001/api/products', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData
    });
    
    if (!productResponse.ok) {
      const errorText = await productResponse.text();
      throw new Error(`Product creation failed: ${productResponse.status} - ${errorText}`);
    }
    
    const productData = await productResponse.json();
    console.log('✅ Product created successfully:');
    
    if (productData.data) {
      console.log(`   ID: ${productData.data.id}`);
      console.log(`   SKU: ${productData.data.sku}`);
      console.log(`   Name: ${productData.data.name}`);
      console.log(`   Price: $${productData.data.salePrice}`);
      console.log(`   Brand: ${productData.data.brand.name}`);
      console.log(`   Category: ${productData.data.category.name}`);
    } else {
      console.log('   Unexpected response structure:', JSON.stringify(productData, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testCreateProduct();
