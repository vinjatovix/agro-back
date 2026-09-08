import type { Server } from 'node:http';
import request, { type Response } from 'supertest';

import { UuidMother } from '../../../../../Contexts/shared/fixtures/UuidMother.js';
import type { BedPrimitives } from '../../../../../../src/Contexts/Agro/Beds/domain/entities/types/BedPrimitives.js';

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
    const payload = {
      id: overrides?.id ?? UuidMother.random().value,
      name: overrides?.name ?? 'Test bed',
      width: overrides?.width ?? 100,
      height: overrides?.height ?? 100,
      depth: overrides?.depth ?? 30
    };

    const response: Response = await request(server)
      .post('/api/v1/beds')
      .set('Authorization', `Bearer ${token}`)
      .send(payload)
      .expect(201);

    return response.body as BedPrimitives;
  }
});
