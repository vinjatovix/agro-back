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
      const name = overrides.name || random.word();
      const body: CreateFamilyDto = {
        id: random.uuid(),
        slug: name,
        name: `${name}-family`,
        aliases: [],
        scientificName: `${name}-scientific`,
        shortDescription: `${name}-short-description`,
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
    },
    async createMany(
      count: number,
      overrides: Partial<CreateFamilyDto> = {}
    ): Promise<FamilyPrimitives[]> {
      const families: FamilyPrimitives[] = [];

      for (let i = 0; i < count; i++) {
        const family = await this.create(overrides);
        families.push(family);
      }

      return families;
    },
    async seed(): Promise<FamilyPrimitives[]> {
      const base = [
        {
          id: crypto.randomUUID(),
          name: 'Asteraceae',
          slug: 'asteraceae',
          scientificName: 'Asteraceae',
          aliases: ['flower'],
          shortDescription: 'asteraceae',
          highlights: []
        },
        {
          id: crypto.randomUUID(),
          name: 'Solanaceae',
          slug: 'solanaceae',
          scientificName: 'Solanum family',
          aliases: ['rose'],
          shortDescription: 'solanaceae',
          highlights: []
        },
        {
          id: crypto.randomUUID(),
          name: 'Rosaceae',
          slug: 'rosaceae',
          scientificName: 'Rosaceae',
          aliases: ['rose family'],
          shortDescription: 'rosaceae',
          highlights: []
        },
        {
          id: crypto.randomUUID(),
          name: 'Lamiaceae',
          slug: 'lamiaceae',
          scientificName: 'Lamiaceae',
          aliases: ['flower herb'],
          shortDescription: 'lamiaceae',
          highlights: []
        }
      ];
      const created: FamilyPrimitives[] = [];

      for (const family of base) {
        const response = await request(httpServer)
          .post('/api/v1/families')
          .set('Authorization', `Bearer ${token}`)
          .send(family);

        if (response.status !== 201) {
          throw new Error(`Seeder failed: ${response.text}`);
        }

        created.push(response.body as FamilyPrimitives);
      }

      return created;
    }
  };
};
