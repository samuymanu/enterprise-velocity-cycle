import request from 'supertest';
import { getEnvConfig } from './src/config/env';

const BASE_URL = `http://localhost:${getEnvConfig().PORT || 3001}`;

describe('Clientes API', () => {
  it('rechaza cliente sin email', async () => {
    const token = process.env.TEST_JWT || '';
    const res = await request(BASE_URL)
      .post('/api/customers')
      .set('Authorization', `Bearer ${token}`)
      .send({ firstName: 'Juan', lastName: 'Pérez' });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});
