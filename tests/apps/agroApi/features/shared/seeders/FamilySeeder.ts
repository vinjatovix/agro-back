import request from 'supertest';
import type { Server } from 'node:http';
import type { CreateFamilyDto } from '../../../../../../src/Contexts/Agro/Families/application/useCases/interfaces/CreateFamilyDto.js';
import { random } from '../../../../../Contexts/shared/fixtures/random.js';
import type { FamilyPrimitives } from '../../../../../../src/Contexts/Agro/Families/domain/types/FamilyPrimitives.js';

export const FamilySeeder = (httpServer: Server, token: string) => {
  return {
    async create(
      overrides: Partial<CreateFamilyDto> = {}
    ): Promise<FamilyPrimitives> {
      const body: CreateFamilyDto = {
        id: random.uuid(),
        slug: 'solanaceae',
        name: 'Solanaceae',
        aliases: [],
        scientificName: 'Solanum family',
        shortDescription: 'Nightshade family',
        highlights: [],
        ...overrides
      };

      const response = await request(httpServer)
        .post('/api/v1/families')
        .set('Authorization', `Bearer ${token}`)
        .send(body);

      if (response.status !== 201) {
        throw new Error(`FamilySeeder failed: ${response.text}`);
      }

      return response.body as FamilyPrimitives;
    }
  };
};
