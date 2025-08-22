#!/usr/bin/env node
/**
 * 🏥 HEALTH CHECK ENTERPRISE
 * Script de verificación de salud para contenedor backend
 */

const http = require('http');

const options = {
  hostname: 'localhost',
  port: process.env.PORT || 3001,
  path: '/api/health',
  method: 'GET',
  timeout: 5000
};

const healthCheck = http.request(options, (res) => {
  if (res.statusCode === 200) {
    console.log('✅ Health check passed');
    process.exit(0);
  } else {
    console.log(`❌ Health check failed with status: ${res.statusCode}`);
    process.exit(1);
  }
});

healthCheck.on('error', (err) => {
  console.log(`❌ Health check failed: ${err.message}`);
  process.exit(1);
});

healthCheck.on('timeout', () => {
  console.log('❌ Health check timeout');
  healthCheck.destroy();
  process.exit(1);
});

healthCheck.end();
