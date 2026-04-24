import { createAppContainer } from '../../../../../../../src/apps/agroApi/container.js';
import type { PlantPrimitives } from '../../../../../../../src/Contexts/agroApi/agro/plants/domain/entities/types/PlantPrimitives.js';
import type { PlantRepository } from '../../../../../../../src/Contexts/agroApi/agro/plants/domain/repositories/PlantRepository.js';
import { plantMapper } from '../../../../../../../src/Contexts/agroApi/agro/plants/mappers/plantMapper.js';
import type { EnvironmentArranger } from '../../../../../../../src/shared/infrastructure/arranger/EnvironmentArranger.js';
import { random } from '../../../../../shared/fixtures/random.js';
import { PlantFactory } from '../../domain/mothers/PlantFactory.js';

const container = createAppContainer();
const repository = container.resolve<PlantRepository>('plantRepository');

const environmentArranger: Promise<EnvironmentArranger> = Promise.resolve(
  container.resolve<EnvironmentArranger>('environmentArranger')
);

describe('MongoPlantRepository', () => {
  beforeEach(async () => {
    await (await environmentArranger).arrange();
  });

  afterAll(async () => {
    await (await environmentArranger).arrange();
    await (await environmentArranger).close();
  });

  describe('save + findById', () => {
    it('should save and retrieve a plant', async () => {
      const plant = PlantFactory.full();

      await repository.save(plant);

      const found = await repository.findById(plant.id.value);

      expect(found.id.value).toBe(plant.id.value);
      expect(found.identity).toEqual(plant.identity);
      expect(found.traits).toEqual(plant.traits);
      expect(found.phenology).toEqual(plant.phenology);
      expect(found.knowledge).toEqual(plant.knowledge);
      expect(found.status).toBe('ACTIVE');
    });
  });

  describe('updateWithDiff', () => {
    it('should update plant name', async () => {
      const plant = PlantFactory.random();
      const current = plantMapper.toPrimitives(plant);

      await repository.save(plant);

      const updated = {
        identity: {
          name: {
            primary: 'New name'
          }
        }
      };

      await repository.updateWithDiff(
        current,
        updated as unknown as PlantPrimitives,
        'user-1'
      );

      const result = await repository.findById(plant.id.value);

      expect(result.identity.name.primary).toBe('New name');
    });

    it('should allow clearing scientificName when set to null', async () => {
      const plant = PlantFactory.full();
      const current = plantMapper.toPrimitives(plant);
      await repository.save(plant);

      const updated = {
        identity: {
          scientificName: null
        }
      };

      await repository.updateWithDiff(
        current,
        updated as unknown as PlantPrimitives,
        'user-1'
      );

      const result = await repository.findById(plant.id.value);

      expect(plant.identity.scientificName).toBeDefined();
      expect(result.identity.scientificName).toBeUndefined();
    });

    it('should NOT overwrite untouched fields', async () => {
      const plant = PlantFactory.random();
      const current = plantMapper.toPrimitives(plant);
      await repository.save(plant);

      const originalHeight = plant.traits.size.height;
      const originalSpread = plant.traits.size.spread;

      const updated = {
        identity: {
          name: {
            primary: random.name()
          }
        }
      };

      await repository.updateWithDiff(
        current,
        updated as unknown as PlantPrimitives,
        'user-1'
      );

      const result = await repository.findById(plant.id.value);

      expect(result.traits.size.height).toEqual(originalHeight);
      expect(result.traits.size.spread).toEqual(originalSpread);
    });

    it('should update nested size partially', async () => {
      const plant = PlantFactory.random();
      const current = plantMapper.toPrimitives(plant);
      await repository.save(plant);

      const updated = {
        traits: {
          size: {
            height: {
              max: 999
            },
            spread: plant.traits.size.spread
          }
        }
      };

      await repository.updateWithDiff(
        current,
        updated as unknown as PlantPrimitives,
        'user-1'
      );

      const result = await repository.findById(plant.id.value);

      expect(result.traits.size.height.min).toBe(plant.traits.size.height.min);
      expect(result.traits.size.height.max).toBe(999);
      expect(result.traits.size.spread.min).toBe(plant.traits.size.spread.min);
      expect(result.traits.size.spread.max).toBe(plant.traits.size.spread.max);
    });

    it('should return true if plant exists', async () => {
      const plant = PlantFactory.random();

      await repository.save(plant);

      const exists = await repository.exists(plant.id.value);

      expect(exists).toBe(true);
    });

    it('should return all plants', async () => {
      const plant1 = PlantFactory.random();

      const plant2 = PlantFactory.random();

      await repository.save(plant1);
      await repository.save(plant2);

      const all = await repository.findAll();

      expect(all).toHaveLength(2);
    });

    it('should update metadata on every update', async () => {
      const plant = PlantFactory.random();
      const current = plantMapper.toPrimitives(plant);
      await repository.save(plant);

      const updated = {
        identity: {
          name: {
            primary: random.name()
          }
        }
      } as unknown as PlantPrimitives;

      await repository.updateWithDiff(current, updated, 'user-1');

      const result = await repository.findById(plant.id.value);

      expect(result.metadata.updatedBy).toBe('user-1');
    });

    it("should not update metadata's createdBy on update", async () => {
      const plant = PlantFactory.random();
      const current = plantMapper.toPrimitives(plant);
      await repository.save(plant);

      const originalCreatedBy = plant.metadata.createdBy;

      const updated = {
        identity: {
          name: {
            primary: plant.identity.name.primary
          }
        }
      } as unknown as PlantPrimitives;

      await repository.updateWithDiff(current, updated, 'user-1');

      const result = await repository.findById(plant.id.value);

      expect(result.metadata.createdBy).toBe(originalCreatedBy);
    });

    it('should not update metadata if there are no changes', async () => {
      const plant = PlantFactory.random();
      const current = plantMapper.toPrimitives(plant);
      await repository.save(plant);

      const originalMetadata = plant.metadata;

      const updated = {
        identity: {
          name: {
            primary: plant.identity.name.primary
          }
        }
      } as unknown as PlantPrimitives;

      await repository.updateWithDiff(current, updated, 'user-1');

      const result = await repository.findById(plant.id.value);

      expect(result.metadata).toEqual(originalMetadata);
    });

    it('should handle non-existent plant on update', async () => {
      const plant = PlantFactory.random();
      const current = plantMapper.toPrimitives(plant);

      const updated = {
        identity: {
          name: {
            primary: 'New name'
          }
        }
      } as unknown as PlantPrimitives;

      await expect(
        repository.updateWithDiff(current, updated, 'user-1')
      ).rejects.toThrow(`Plant not found: ${plant.id.value}`);
    });
  });
});
