// Script para probar categorías jerárquicas
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

const testHierarchicalCategories = async () => {
  console.log('🏷️ Probando CATEGORÍAS JERÁRQUICAS del BikeShop ERP...\n');
  
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

    // 2. Crear categorías principales
    console.log('📁 Creando categorías principales...');
    const mainCategories = [
      { 
        name: 'Bicicletas', 
        description: 'Bicicletas completas de todos los tipos',
        level: 0 
      },
      { 
        name: 'Repuestos', 
        description: 'Repuestos y componentes para bicicletas',
        level: 0 
      },
      { 
        name: 'Accesorios', 
        description: 'Accesorios para ciclismo y seguridad',
        level: 0 
      }
    ];

    const createdMainCategories = [];
    for (const category of mainCategories) {
      const result = await makeRequest('/api/categories', 'POST', category, token);
      console.log(`   ${category.name}: Status ${result.status}`);
      if (result.status === 201) {
        createdMainCategories.push(result.data);
      }
    }

    // 3. Crear subcategorías
    console.log('\n📂 Creando subcategorías...');
    
    // Encontrar categoría "Bicicletas"
    const bicicletasCategory = createdMainCategories.find(c => c.name === 'Bicicletas');
    if (bicicletasCategory) {
      const subCategories = [
        {
          name: 'Mountain Bike',
          description: 'Bicicletas para montaña y terreno irregular',
          parentId: bicicletasCategory.id,
          level: 1,
          path: 'Bicicletas/Mountain Bike'
        },
        {
          name: 'Ruta',
          description: 'Bicicletas de carretera y competición',
          parentId: bicicletasCategory.id,
          level: 1,
          path: 'Bicicletas/Ruta'
        },
        {
          name: 'BMX',
          description: 'Bicicletas para acrobacias y freestyle',
          parentId: bicicletasCategory.id,
          level: 1,
          path: 'Bicicletas/BMX'
        }
      ];

      for (const subCategory of subCategories) {
        const result = await makeRequest('/api/categories', 'POST', subCategory, token);
        console.log(`   ${subCategory.name}: Status ${result.status}`);
      }
    }

    // 4. Listar todas las categorías
    console.log('\n📋 Listando todas las categorías...');
    const categoriesResult = await makeRequest('/api/categories', 'GET', null, token);
    if (categoriesResult.status === 200) {
      console.log(`Total categorías: ${categoriesResult.data.length}`);
      categoriesResult.data.forEach(cat => {
        const indent = '  '.repeat(cat.level);
        console.log(`${indent}${cat.level === 0 ? '📁' : '📂'} ${cat.name} (Level: ${cat.level})`);
        if (cat.path) console.log(`${indent}   📍 Path: ${cat.path}`);
      });
    }

    console.log('\n🎉 ¡Prueba de categorías jerárquicas completada!');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
};

testHierarchicalCategories();
