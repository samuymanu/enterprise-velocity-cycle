// Test de integración para las rutas de// Test básico de salud del servidor
async function testServerHealth() {
  try {
    console.log('🔍 Verificando que el servidor está corriendo...');
    
    // Test básico de salud del servidor
    const response = await makeRequest('/products');
    
    console.log('✅ Servidor backend está funcionando');
    console.log('📊 Status:', response.status);
    
    return true;
  } catch (error) {
    console.log('❌ Error conectando al servidor:', error.message);
    return false;
  }
}Service
const http = require('http');

const BASE_URL = 'localhost';
const PORT = 3000;

// Función helper para hacer requests HTTP
function makeRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const requestOptions = {
      hostname: BASE_URL,
      port: PORT,
      path: `/api${path}`,
      method: options.method || 'GET',
      timeout: 5000,
      ...options
    };

    const req = http.request(requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

// Test simple para verificar que el servidor responde
async function testServerHealth() {
  try {
    console.log('🔍 Verificando que el servidor está corriendo...');
    
    // Test básico de salud del servidor
    const response = await axios.get(`${BASE_URL}/products`, {
      timeout: 5000
    });
    
    console.log('✅ Servidor backend está funcionando');
    console.log('📊 Status:', response.status);
    
    return true;
  } catch (error) {
    console.log('❌ Error conectando al servidor:', error.message);
    return false;
  }
}

// Test de las nuevas rutas de productStock
async function testProductStockRoutes() {
  try {
    console.log('🧪 Probando rutas del Enhanced Product Service...');
    
    // Nota: Estas rutas requieren autenticación, esperamos 401
    const testRoutes = [
      '/products/test-id/stock/metrics',
      '/products/test-id/stock/history',
      '/products/test-id/stock/alerts',
      '/products/attention'
    ];
    
    for (const route of testRoutes) {
      try {
        const response = await makeRequest(route);
        console.log(`✅ Ruta ${route} está disponible (Status: ${response.status})`);
      } catch (error) {
        if (error.message.includes('401')) {
          console.log(`✅ Ruta ${route} está disponible (requiere autenticación)`);
        } else {
          console.log(`❌ Error en ruta ${route}:`, error.message);
        }
      }
    }
    
    return true;
  } catch (error) {
    console.log('❌ Error probando rutas:', error.message);
    return false;
  }
}

// Ejecutar tests
async function runTests() {
  console.log('🚀 Iniciando tests de integración del Enhanced Product Service\n');
  
  const serverOk = await testServerHealth();
  if (!serverOk) {
    console.log('❌ No se puede continuar sin servidor backend funcionando');
    process.exit(1);
  }
  
  console.log('');
  await testProductStockRoutes();
  
  console.log('\n✅ Tests de integración completados');
}

// Solo ejecutar si es llamado directamente
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testServerHealth, testProductStockRoutes };
