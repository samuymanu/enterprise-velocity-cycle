import request from 'supertest';
import { getEnvConfig } from './src/config/env';

const BASE_URL = `http://localhost:${getEnvConfig().PORT || 3001}`;

describe('Auth API', () => {
  it('rechaza login con credenciales inválidas', async () => {
    const res = await request(BASE_URL)
      .post('/api/auth/login')
      .send({ identifier: 'fake@user.com', password: 'wrongpass' });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});

describe('Productos API', () => {
  it('rechaza producto inválido', async () => {
    const res = await request(BASE_URL)
      .post('/api/products')
      .send({ name: '' });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});

describe('Ventas API', () => {
  it('rechaza venta sin items', async () => {
    const token = process.env.TEST_JWT || '';
    const res = await request(BASE_URL)
      .post('/api/sales')
      .set('Authorization', `Bearer ${token}`)
      .send({ customerId: '00000000-0000-0000-0000-000000000000', items: [], total: 0, paymentMethod: 'EFECTIVO' });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});
