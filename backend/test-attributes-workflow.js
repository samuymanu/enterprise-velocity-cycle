#!/usr/bin/env node

/**
 * Script para probar la funcionalidad completa de atributos
 */

const { default: fetch } = require('node-fetch');

async function testAttributeWorkflow() {
  console.log('🧪 Testing complete attribute workflow...');
  
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
    
    // 2. Crear un atributo real
    console.log('📝 Creating a real attribute...');
    const attributeData = {
      name: 'Talla de Marco',
      type: 'LIST',
      description: 'Talla del marco de bicicleta',
      options: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
      unit: '',
      isGlobal: false
    };
    
    const attrResponse = await fetch('http://localhost:3001/api/attributes', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(attributeData)
    });
    
    let attributeId;
    if (attrResponse.ok) {
      const attrResult = await attrResponse.json();
      attributeId = attrResult.attribute.id;
      console.log(`✅ Attribute created: ${attrResult.attribute.name} (${attributeId})`);
    } else {
      const errorText = await attrResponse.text();
      if (errorText.includes('already exists') || errorText.includes('ya existe')) {
        console.log('⚠️  Attribute already exists, getting existing...');
        // Obtener el atributo existente
        const existingAttrsResponse = await fetch('http://localhost:3001/api/attributes', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        const existingAttrs = await existingAttrsResponse.json();
        const existingAttr = existingAttrs.attributes.find(attr => attr.name === 'Talla de Marco');
        if (existingAttr) {
          attributeId = existingAttr.id;
          console.log(`✅ Found existing attribute: ${existingAttr.name} (${attributeId})`);
        }
      } else {
        throw new Error(`Failed to create attribute: ${errorText}`);
      }
    }
    
    // 3. Asignar el atributo a la categoría Mountain Bike
    console.log('🔗 Assigning attribute to Mountain Bike category...');
    const categoriesResponse = await fetch('http://localhost:3001/api/categories', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const categoriesData = await categoriesResponse.json();
    const mtbCategory = categoriesData.categories.find(cat => cat.code === 'MTB');
    
    if (mtbCategory && attributeId) {
      const assignResponse = await fetch(`http://localhost:3001/api/attributes/${attributeId}/categories`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ categoryId: mtbCategory.id })
      });
      
      if (assignResponse.ok) {
        console.log(`✅ Attribute assigned to category: ${mtbCategory.name}`);
      } else {
        const errorText = await assignResponse.text();
        if (errorText.includes('already assigned')) {
          console.log('⚠️  Attribute already assigned to category');
        } else {
          console.log(`⚠️  Failed to assign attribute: ${errorText}`);
        }
      }
    }
    
    // 4. Verificar atributos por categoría
    console.log('📋 Getting attributes for Mountain Bike category...');
    const categoryAttrsResponse = await fetch(`http://localhost:3001/api/attributes?categoryId=${mtbCategory.id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const categoryAttrsData = await categoryAttrsResponse.json();
    console.log('✅ Category attributes:', categoryAttrsData.attributes.map(attr => attr.name));
    
    // 5. Crear un producto con atributos
    console.log('🚴 Creating product with attributes...');
    const FormData = require('form-data');
    const formData = new FormData();
    
    formData.append('name', 'Mountain Bike Test con Atributos');
    formData.append('description', 'Bicicleta de montaña con atributos de prueba');
    formData.append('categoryId', mtbCategory.id);
    formData.append('brand', 'Trek');
    formData.append('costPrice', '900');
    formData.append('salePrice', '1400');
    formData.append('stock', '3');
    formData.append('minStock', '1');
    formData.append('sku', 'MTB-ATTR-TEST-001');
    formData.append('barcode', 'MTB-ATTR-TEST-001');
    
    // Agregar atributos
    const attributesToSend = [
      {
        attributeId: attributeId,
        value: 'L'
      }
    ];
    formData.append('attributes', JSON.stringify(attributesToSend));
    
    const productResponse = await fetch('http://localhost:3001/api/products', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData
    });
    
    if (productResponse.ok) {
      const productData = await productResponse.json();
      console.log('✅ Product with attributes created successfully:');
      console.log(`   ID: ${productData.data.id}`);
      console.log(`   Name: ${productData.data.name}`);
      console.log(`   SKU: ${productData.data.sku}`);
      
      // Verificar que el producto tenga los atributos
      const productDetails = await fetch(`http://localhost:3001/api/products/${productData.data.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (productDetails.ok) {
        const details = await productDetails.json();
        console.log('📊 Product attributes:', details.product.productAttributes || 'No attributes found');
      }
    } else {
      const errorText = await productResponse.text();
      console.error('❌ Failed to create product with attributes:', errorText);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAttributeWorkflow();
