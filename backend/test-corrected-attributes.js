#!/usr/bin/env node

/**
 * Script para probar las funciones de atributos corregidas
 */

const { default: fetch } = require('node-fetch');

async function testCorrectedAttributeFunctions() {
  console.log('🧪 Testing corrected attribute functions...');
  
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
    
    console.log(`✅ Found MTB category: ${mtbCategory.name} (${mtbCategory.id})`);
    
    // 3. Probar creación de atributo con la estructura que espera el frontend
    const timestamp = Date.now();
    console.log(`🎨 Creating test attribute "Peso del Marco ${timestamp}"...`);
    
    const attributeData = {
      categoryId: mtbCategory.id,
      name: `Peso del Marco ${timestamp}`,
      type: 'NUMBER',
      isRequired: false,
      unit: 'kg',
      description: 'Peso del marco en kilogramos',
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
    
    if (attrResponse.ok) {
      const attrResult = await attrResponse.json();
      console.log(`✅ Attribute created: ${attrResult.attribute.name} (${attrResult.attribute.id})`);
      
      // 4. Verificar que el atributo aparece en la categoría
      console.log('📋 Checking if attribute appears in category...');
      const categoryAttrsResponse = await fetch(`http://localhost:3001/api/attributes?categoryId=${mtbCategory.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const categoryAttrsData = await categoryAttrsResponse.json();
      const foundAttr = categoryAttrsData.attributes.find(attr => attr.id === attrResult.attribute.id);
      
      if (foundAttr) {
        console.log('✅ Attribute successfully appears in category attributes');
        console.log(`   - Name: ${foundAttr.name}`);
        console.log(`   - Type: ${foundAttr.type}`);
        console.log(`   - Unit: ${foundAttr.unit || 'None'}`);
      } else {
        console.log('❌ Attribute NOT found in category attributes');
      }
      
    } else {
      const errorText = await attrResponse.text();
      console.error(`❌ Failed to create attribute: ${errorText}`);
    }
    
    console.log('\n🎉 Corrected attribute functions test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testCorrectedAttributeFunctions();
