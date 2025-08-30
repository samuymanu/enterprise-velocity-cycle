// Script de prueba para verificar el API de customers

const BASE_URL = 'http://localhost:3002/api';

async function testAPI() {
  try {
    console.log('🔍 Testing Customer API...\n');

    // 1. Login
    console.log('1. Testing login...');
    const loginResponse = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'admin@bikeshop.com',
        password: 'DevAdmin@2025!'
      })
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status} ${loginResponse.statusText}`);
    }

    const loginData = await loginResponse.json();
    const token = loginData.token;
    console.log('✅ Login successful\n');

    // 2. Get customers (should be empty initially)
    console.log('2. Testing GET /customers...');
    const getResponse = await fetch(`${BASE_URL}/customers`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!getResponse.ok) {
      const errorText = await getResponse.text();
      console.log('❌ GET customers failed:');
      console.log('Status:', getResponse.status);
      console.log('Response:', errorText);
      return;
    }

    const customers = await getResponse.json();
    console.log('✅ GET customers successful:', customers);
    console.log('');

    // 3. Create customer
    console.log('3. Testing POST /customers...');
    const customerData = {
      documentType: 'CI',
      documentNumber: 'V12345678',
      firstName: 'Juan',
      lastName: 'Perez',
      customerType: 'INDIVIDUAL',
      email: 'juan@test.com',
      phone: '04121234567',
      address: 'Caracas',
      city: 'Caracas',
      state: 'DC',
      country: 'Venezuela',
      isActive: true
    };

    const createResponse = await fetch(`${BASE_URL}/customers`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(customerData)
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.log('❌ Create customer failed:');
      console.log('Status:', createResponse.status);
      console.log('Response:', errorText);
      return;
    }

    const newCustomer = await createResponse.json();
    console.log('✅ Customer created successfully:', newCustomer);

    console.log('\n🎉 All tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAPI();
