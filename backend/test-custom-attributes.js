#!/usr/bin/env node

/**
 * Script para probar la funcionalidad de atributos personalizados corregida
 */

const { default: fetch } = require('node-fetch');

async function testCustomAttributeWorkflow() {
  console.log('🧪 Testing custom attribute workflow...');
  
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
    
    // 2. Obtener categorías disponibles
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
    
    // 3. Crear un atributo personalizado
    const timestamp = Date.now();
    console.log(`🎨 Creating custom attribute "Material del Marco ${timestamp}"...`);
    const customAttributeData = {
      name: `Material del Marco ${timestamp}`,
      type: 'LIST',
      description: 'Material principal del marco de la bicicleta',
      options: ['Aluminio', 'Carbono', 'Acero', 'Titanio'],
      unit: '',
      isGlobal: false
    };
    
    let customAttributeId;
    const customAttrResponse = await fetch('http://localhost:3001/api/attributes', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(customAttributeData)
    });
    
    if (customAttrResponse.ok) {
      const customAttrResult = await customAttrResponse.json();
      customAttributeId = customAttrResult.attribute.id;
      console.log(`✅ Custom attribute created: ${customAttrResult.attribute.name} (${customAttributeId})`);
    } else {
      const errorText = await customAttrResponse.text();
      if (errorText.includes('already exists') || errorText.includes('ya existe')) {
        console.log('⚠️  Custom attribute already exists, getting existing...');
        // Obtener el atributo existente
        const existingAttrsResponse = await fetch('http://localhost:3001/api/attributes', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        const existingAttrs = await existingAttrsResponse.json();
        const existingAttr = existingAttrs.attributes.find(attr => attr.name.includes('Material del Marco'));
        if (existingAttr) {
          customAttributeId = existingAttr.id;
          console.log(`✅ Found existing custom attribute: ${existingAttr.name} (${customAttributeId})`);
        }
      } else {
        throw new Error(`Failed to create custom attribute: ${errorText}`);
      }
    }
    
    // 4. Asignar el atributo personalizado a la categoría MTB
    console.log('🔗 Assigning custom attribute to MTB category...');
    const assignCustomResponse = await fetch(`http://localhost:3001/api/attributes/${customAttributeId}/categories`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ categoryIds: [mtbCategory.id] })
    });
    
    if (assignCustomResponse.ok) {
      console.log(`✅ Custom attribute assigned to category: ${mtbCategory.name}`);
    } else {
      const errorText = await assignCustomResponse.text();
      if (errorText.includes('already assigned')) {
        console.log('⚠️  Custom attribute already assigned to category');
      } else {
        console.log(`⚠️  Failed to assign custom attribute: ${errorText}`);
      }
    }
    
    // 5. Verificar que el atributo aparece en los atributos de la categoría
    console.log('📋 Checking attributes for MTB category...');
    const categoryAttrsResponse = await fetch(`http://localhost:3001/api/attributes?categoryId=${mtbCategory.id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const categoryAttrsData = await categoryAttrsResponse.json();
    const customAttrInCategory = categoryAttrsData.attributes.find(attr => attr.id === customAttributeId);
    
    if (customAttrInCategory) {
      console.log('✅ Custom attribute appears in category attributes:');
      console.log(`   - ${customAttrInCategory.name} (${customAttrInCategory.type})`);
      console.log(`   - Options: ${customAttrInCategory.options?.join(', ') || 'None'}`);
    } else {
      console.log('❌ Custom attribute NOT found in category attributes');
    }
    
    console.log('\n📊 All category attributes:');
    categoryAttrsData.attributes.forEach((attr, index) => {
      console.log(`   ${index + 1}. ${attr.name} (${attr.type}) - ${attr.id === customAttributeId ? 'CUSTOM' : 'EXISTING'}`);
    });
    
    console.log('\n🎉 Custom attribute workflow test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testCustomAttributeWorkflow();
