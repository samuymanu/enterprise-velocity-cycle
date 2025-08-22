import jwt from 'jsonwebtoken';
import { getJwtConfig } from '../src/config/env';

const jwtConfig = getJwtConfig();

export function generateTestJWT(userId: string = 'test-user-id', email: string = 'test@test.com', role: string = 'ADMIN'): string {
  return jwt.sign(
    {
      userId,
      email,
      role,
      username: 'testuser'
    },
    jwtConfig.secret,
    {
      expiresIn: '1h' // 1 hora para los tests
    }
  );
}

export function generateExpiredJWT(): string {
  return jwt.sign(
    {
      userId: 'expired-user',
      email: 'expired@test.com', 
      role: 'USER'
    },
    jwtConfig.secret,
    {
      expiresIn: '-1h' // Token expirado
    }
  );
}
