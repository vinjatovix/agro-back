import { createAppContainer } from '../../../../../../../src/apps/agroApi/container.js';
import type { PlantRepository } from '../../../../../../../src/Contexts/agroApi/agro/plants/domain/repositories/PlantRepository.js';
import { Range } from '../../../../../../../src/shared/domain/value-objects/Range.js';
import type { EnvironmentArranger } from '../../../../../../../src/shared/infrastructure/arranger/EnvironmentArranger.js';
import { random } from '../../../../../shared/fixtures/random.js';
import { PlantMother } from '../../domain/mothers/PlantMother.js';

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
      const plant = PlantMother.tomato();

      await repository.save(plant);

      const found = await repository.findById(plant.id.value);

      expect(found).toEqual(plant);
    });
  });

  describe('updateWithDiff', () => {
    it('should update plant name', async () => {
      const plant = PlantMother.create({
        name: 'Old name'
      });

      await repository.save(plant);

      const updated = {
        id: plant.id.value,
        name: 'New name'
      };

      await repository.updateWithDiff(plant, updated, 'user-1');

      const result = await repository.findById(plant.id.value);

      expect(result.name).toBe('New name');
    });

    it('should allow clearing scientificName when set to null', async () => {
      const plant = PlantMother.create({
        scientificName: 'Solanum lycopersicum'
      });

      await repository.save(plant);

      const updated = {
        id: plant.id.value,
        scientificName: null
      };

      await repository.updateWithDiff(plant, updated, 'user-1');

      const result = await repository.findById(plant.id.value);

      expect(result.scientificName).toBeUndefined();
    });

    it('should NOT overwrite untouched fields', async () => {
      const plant = PlantMother.create();

      await repository.save(plant);

      const updated = {
        id: plant.id.value,
        name: random.name()
      };

      await repository.updateWithDiff(plant, updated, 'user-1');

      const result = await repository.findById(plant.id.value);

      expect(result.size.height.min).toBe(plant.size.height.min);
      expect(result.size.spread.max).toBe(plant.size.spread.max);
    });

    it('should update nested size partially', async () => {
      const plant = PlantMother.create();

      await repository.save(plant);

      const updated = {
        id: plant.id.value,
        size: {
          height: new Range(999, 999),
          spread: plant.size.spread
        }
      };

      await repository.updateWithDiff(plant, updated, 'user-1');

      const result = await repository.findById(plant.id.value);

      expect(result.size.height.min).toBe(999);
      expect(result.size.height.max).toBe(999);
      expect(result.size.spread.min).toBe(plant.size.spread.min);
    });

    it('should return true if plant exists', async () => {
      const plant = PlantMother.create();

      await repository.save(plant);

      const exists = await repository.exists(plant.id.value);

      expect(exists).toBe(true);
    });

    it('should return all plants', async () => {
      const plant1 = PlantMother.tomato();
      const plant2 = PlantMother.lettuce();

      await repository.save(plant1);
      await repository.save(plant2);

      const all = await repository.findAll();

      expect(all).toHaveLength(2);
    });

    it('should update metadata on every update', async () => {
      const plant = PlantMother.create();

      await repository.save(plant);

      const updated = {
        id: plant.id.value,
        name: plant.name
      };

      await repository.updateWithDiff(plant, updated, 'user-1');

      const result = await repository.findById(plant.id.value);

      expect(result.metadata.updatedBy).toBe('user-1');
    });
  });
});
