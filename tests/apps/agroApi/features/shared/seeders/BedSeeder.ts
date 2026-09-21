import type { Server } from 'node:http';
import request, { type Response } from 'supertest';
import type { BedPrimitives } from '../../../../../../src/Contexts/Agro/Beds/domain/entities/types/BedPrimitives.js';
import { random } from '../../../../../Contexts/shared/fixtures/random.js';

export const BedSeeder = (server: Server, token: string) => ({
  async createOne(
    overrides?: Partial<{
      id: string;
      name: string;
      width: number;
      height: number;
      depth: number;
    }>
  ) {
    const defaults = {
      id: random.uuid(),
      name: 'Test bed',
      width: 100,
      height: 100,
      depth: 30
    };
    const payload = { ...defaults, ...overrides };

    const response: Response = await request(server)
      .post('/api/v1/beds')
      .set('Authorization', `Bearer ${token}`)
      .send(payload)
      .expect(201);

    return response.body as BedPrimitives;
  }
});
