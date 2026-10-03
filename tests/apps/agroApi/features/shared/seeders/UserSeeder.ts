import type { Server } from 'node:http';
import request from 'supertest';
import { random } from '../../../../../Contexts/shared/fixtures/random.js';

export type SeededUser = { id: string; username: string; email: string };

export const UserSeeder = (httpServer: Server) => {
  return {
    async create(overrides: Partial<SeededUser> = {}): Promise<SeededUser> {
      const password = 'Abcdef1!';
      const user: SeededUser = {
        id: random.uuid(),
        username: random.word({ min: 8, max: 20 }),
        email: `${random.word({ min: 8, max: 20 })}@seeded.com`,
        ...overrides
      };

      const response = await request(httpServer)
        .post('/api/v1/auth/register')
        .send({ ...user, password, repeatPassword: password });

      if (response.status !== 201) {
        throw new Error(`UserSeeder failed: ${response.text}`);
      }

      return user;
    }
  };
};
