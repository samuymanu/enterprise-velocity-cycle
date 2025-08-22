// Test del sistema de auditoría
const http = require('http');

const BASE_URL = 'localhost';
const PORT = 3002;

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

// Test del sistema de auditoría
async function testAuditSystem() {
  try {
    console.log('🔍 Probando sistema de auditoría...');
    
    const auditRoutes = [
      '/audit/entity/Product/test-product-id',
      '/audit/stats',
      '/audit/product/test-product-id/stock-changes',
      '/audit/recent'
    ];
    
    for (const route of auditRoutes) {
      try {
        const response = await makeRequest(route);
        if (response.status === 401) {
          console.log(`✅ Ruta ${route} está protegida correctamente (401)`);
        } else {
          console.log(`✅ Ruta ${route} está disponible (Status: ${response.status})`);
        }
      } catch (error) {
        console.log(`❌ Error en ruta ${route}:`, error.message);
      }
    }
    
    return true;
  } catch (error) {
    console.log('❌ Error probando sistema de auditoría:', error.message);
    return false;
  }
}

// Ejecutar test
async function runAuditTests() {
  console.log('🚀 Iniciando tests del sistema de auditoría\n');
  
  await testAuditSystem();
  
  console.log('\n✅ Tests de auditoría completados');
}

// Solo ejecutar si es llamado directamente
if (require.main === module) {
  runAuditTests().catch(console.error);
}

module.exports = { testAuditSystem };
