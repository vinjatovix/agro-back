import type { Server } from 'node:http';
import request, { type Response } from 'supertest';
import { UuidMother } from '../../../../../Contexts/shared/fixtures/UuidMother.js';
import type { PlantPrimitives } from '../../../../../../src/Contexts/Agro/Plants/domain/entities/types/PlantPrimitives.js';
import { buildPatch } from '../../../../../shared/dto/buildPatch.js';
import { deepMerge } from '../../../../../shared/dto/deepMerge.js';

export const PlantSeeder = (httpServer: Server, token: string) => {
  return {
    async create(overrides = {}) {
      const base = {
        id: UuidMother.random().value,
        identity: {
          name: { primary: 'Test plant' },
          family: 'fam_test'
        },
        traits: {
          lifecycle: 'annual',
          size: {
            height: { min: 10, max: 20 },
            spread: { min: 10, max: 20 }
          },
          spacingCm: { min: 10, max: 20 }
        },
        phenology: {
          sowing: {
            months: [1],
            seedsPerHole: { min: 1, max: 2 },
            germinationDays: { min: 1, max: 3 },
            methods: {
              direct: { depthCm: { min: 1, max: 2 } }
            }
          },
          flowering: { months: [1] },
          harvest: { months: [1] }
        }
      };
      const patch = buildPatch(overrides);
      const body = deepMerge(base, patch) as PlantPrimitives;

      const res: Response = await request(httpServer)
        .post('/api/v1/plants')
        .set('Authorization', `Bearer ${token}`)
        .send(body);

      return res.body as PlantPrimitives;
    },
    async createMany(count: number, overrides = {}) {
      const plants: PlantPrimitives[] = [];
      for (let i = 0; i < count; i++) {
        const plant = await this.create(overrides);
        plants.push(plant);
      }
      return plants;
    }
  };
};
