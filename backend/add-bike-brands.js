#!/usr/bin/env node

/**
 * Script para agregar marcas de bicicletas reales
 */

const { default: fetch } = require('node-fetch');

async function addBikeBrands() {
  console.log('🚴‍♂️ Adding real bike brands...');
  
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
    
    // 2. Marcas reales de bicicletas
    const bikeBrands = [
      { name: 'Trek', description: 'Marca estadounidense líder en bicicletas de alta calidad' },
      { name: 'Giant', description: 'Fabricante taiwanés, el más grande del mundo en bicicletas' },
      { name: 'Specialized', description: 'Marca estadounidense conocida por innovación y rendimiento' },
      { name: 'Cannondale', description: 'Marca americana famosa por sus cuadros de aluminio' },
      { name: 'Scott', description: 'Marca suiza especializada en bicicletas de montaña y carretera' },
      { name: 'Merida', description: 'Fabricante taiwanés con gran presencia mundial' },
      { name: 'Cube', description: 'Marca alemana reconocida por diseño y calidad' },
      { name: 'Orbea', description: 'Marca española con larga tradición ciclista' },
      { name: 'Bianchi', description: 'Histórica marca italiana, la más antigua del mundo' },
      { name: 'Santa Cruz', description: 'Marca estadounidense premium de mountain bikes' },
      { name: 'Kona', description: 'Marca canadiense especializada en bikes aventureras' },
      { name: 'Surly', description: 'Marca estadounidense de bicicletas robustas y duraderas' }
    ];
    
    // 3. Crear cada marca
    for (const brand of bikeBrands) {
      try {
        console.log(`📝 Creating brand: ${brand.name}...`);
        
        const brandResponse = await fetch('http://localhost:3001/api/brands', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(brand)
        });
        
        if (brandResponse.ok) {
          const result = await brandResponse.json();
          console.log(`✅ ${brand.name} created successfully`);
        } else {
          const errorText = await brandResponse.text();
          if (errorText.includes('already exists') || errorText.includes('ya existe')) {
            console.log(`⚠️  ${brand.name} already exists, skipping...`);
          } else {
            console.error(`❌ Failed to create ${brand.name}: ${errorText}`);
          }
        }
      } catch (brandError) {
        console.error(`❌ Error creating brand ${brand.name}:`, brandError.message);
      }
    }
    
    // 4. Listar todas las marcas
    console.log('\n📋 Final brands list:');
    const brandsResponse = await fetch('http://localhost:3001/api/brands', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const brandsData = await brandsResponse.json();
    brandsData.brands.forEach((brand, index) => {
      console.log(`   ${index + 1}. ${brand.name}`);
    });
    
    console.log(`\n🎉 Total brands available: ${brandsData.brands.length}`);
    
  } catch (error) {
    console.error('❌ Script failed:', error.message);
  }
}

addBikeBrands();
