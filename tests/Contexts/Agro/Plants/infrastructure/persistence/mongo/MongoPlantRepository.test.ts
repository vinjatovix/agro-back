import { Collection, type MongoClient } from 'mongodb';
import {
  type AppContainer,
  createAppContainer
} from '../../../../../../../src/apps/agroApi/container.js';
import type { Plant } from '../../../../../../../src/Contexts/Agro/Plants/domain/entities/Plant.js';
import type { PlantPrimitives } from '../../../../../../../src/Contexts/Agro/Plants/domain/entities/types/PlantPrimitives.js';
import type { PlantRepository } from '../../../../../../../src/Contexts/Agro/Plants/domain/repositories/interfaces/PlantRepository.js';
import { plantDomainMapper } from '../../../../../../../src/Contexts/Agro/Plants/mappers/plantDomainMapper.js';
import { ensureFound } from '../../../../../../../src/Contexts/shared/application/utils/ensureFound.js';
import {
  DomainNotFoundException,
  DomainStaleVersionException
} from '../../../../../../../src/Contexts/shared/domain/errors/index.js';
import type { EnvironmentArranger } from '../../../../../../../src/shared/infrastructure/arranger/EnvironmentArranger.js';
import {
  DBClientFactory,
  DBConfigFactory
} from '../../../../../../../src/shared/infrastructure/persistence/index.js';
import { random } from '../../../../../shared/fixtures/random.js';
import { PlantFactory } from '../../../domain/mothers/PlantFactory.js';

let container: AppContainer;
let repository: PlantRepository;
let environmentArranger: Promise<EnvironmentArranger>;
let client: MongoClient;

const findExisting = async (id: string): Promise<Plant> =>
  ensureFound(await repository.findById(id), 'Plant', id);

describe('MongoPlantRepository', () => {
  beforeAll(async () => {
    client = await DBClientFactory.createClient(
      'agroApi-test',
      DBConfigFactory.createConfig()
    );

    const db = client.db();

    container = createAppContainer({ db, client });
    environmentArranger = Promise.resolve(
      container.resolve<EnvironmentArranger>('environmentArranger')
    );
    repository = container.resolve<PlantRepository>('plantRepository');
  });
  beforeEach(async () => {
    await (await environmentArranger).arrange();
  });

  afterAll(async () => {
    await (await environmentArranger).arrange();
    await (await environmentArranger).close();
    await client.close();
  });

  describe('save + findById', () => {
    it('should save and retrieve a plant', async () => {
      const plant = PlantFactory.full();

      await repository.save(plant);

      const found = await findExisting(plant.id);

      expect(found.id).toBe(plant.id);
      expect(found.identity).toEqual(plant.identity);
      expect(found.traits).toEqual(plant.traits);
      expect(found.phenology).toEqual(plant.phenology);
      expect(found.knowledge).toEqual(plant.knowledge);
      expect(found.status).toBe('ACTIVE');
    });

    it('should return null if plant does not exist', async () => {
      await expect(repository.findById(random.uuid())).resolves.toBeNull();
    });

    it('should return a soft-deleted plant instead of null', async () => {
      const plant = PlantFactory.random();
      plant.markAsDeleted();

      await repository.save(plant);

      const found = await findExisting(plant.id);

      expect(found.isDeleted()).toBe(true);
    });

    it('should return the correct plant among multiple entries', async () => {
      const plant1 = PlantFactory.random();

      const plant2 = PlantFactory.random();

      await repository.save(plant1);
      await repository.save(plant2);

      const found1 = await findExisting(plant1.id);
      const found2 = await findExisting(plant2.id);

      expect(found1.id).toBe(plant1.id);
      expect(found2.id).toBe(plant2.id);
    });
  });

  describe('findActiveById', () => {
    it('should return an active plant', async () => {
      const plant = PlantFactory.random();

      await repository.save(plant);

      const found = await repository.findActiveById(plant.id);

      expect(found?.id).toBe(plant.id);
    });

    it('should return null when the plant is soft-deleted', async () => {
      const plant = PlantFactory.random();
      plant.markAsDeleted();

      await repository.save(plant);

      await expect(repository.findActiveById(plant.id)).resolves.toBeNull();
    });

    it('should return null when the plant does not exist', async () => {
      await expect(
        repository.findActiveById(random.uuid())
      ).resolves.toBeNull();
    });
  });

  describe('updateWithDiff', () => {
    it('should update plant name', async () => {
      const plant = PlantFactory.random();
      const current = plantDomainMapper.toPrimitives(plant);

      await repository.save(plant);

      const updated: PlantPrimitives = {
        ...current,
        identity: {
          ...current.identity,
          name: { ...current.identity.name, primary: 'New name' }
        }
      };

      await repository.updateWithDiff(current, updated, 'user-1');

      const result = await findExisting(plant.id);

      expect(result.identity.name.primary).toBe('New name');
    });

    it('should throw DomainStaleVersionException when updating from a stale version', async () => {
      const plant = PlantFactory.random();
      const stale = plantDomainMapper.toPrimitives(plant);
      await repository.save(plant);

      const renamed = (primary: string): PlantPrimitives => ({
        ...stale,
        identity: {
          ...stale.identity,
          name: { ...stale.identity.name, primary }
        }
      });

      await repository.updateWithDiff(stale, renamed('First writer'), 'user-1');

      await expect(
        repository.updateWithDiff(stale, renamed('Second writer'), 'user-1')
      ).rejects.toThrow(DomainStaleVersionException);

      const result = await findExisting(plant.id);
      expect(result.identity.name.primary).toBe('First writer');
      expect(result.version).toBe(stale.version + 1);
    });

    it('should match a plant stored without a version field as version 0', async () => {
      const plant = PlantFactory.random();
      await repository.save(plant);
      await client
        .db()
        .collection('plants')
        .updateMany({}, { $unset: { version: '' } });

      const current = plantDomainMapper.toPrimitives(
        await findExisting(plant.id)
      );
      await repository.updateWithDiff(
        current,
        {
          ...current,
          identity: {
            ...current.identity,
            name: { ...current.identity.name, primary: 'Legacy rename' }
          }
        },
        'user-1'
      );

      const result = await findExisting(plant.id);
      expect(current.version).toBe(0);
      expect(result.identity.name.primary).toBe('Legacy rename');
      expect(result.version).toBe(1);
    });

    it('should not count documents after a successful conditional write', async () => {
      const plant = PlantFactory.random();
      await repository.save(plant);
      const current = plantDomainMapper.toPrimitives(plant);
      const countSpy = jest.spyOn(Collection.prototype, 'countDocuments');

      try {
        await repository.updateWithDiff(
          current,
          {
            ...current,
            identity: {
              ...current.identity,
              name: { ...current.identity.name, primary: 'Renamed' }
            }
          },
          'user-1'
        );

        expect(countSpy).not.toHaveBeenCalled();
      } finally {
        countSpy.mockRestore();
      }
    });

    it('should count documents exactly once after a failed conditional write', async () => {
      const plant = PlantFactory.random();
      await repository.save(plant);
      const current = plantDomainMapper.toPrimitives(plant);
      const countSpy = jest.spyOn(Collection.prototype, 'countDocuments');

      try {
        await expect(
          repository.updateWithDiff(
            { ...current, version: current.version + 3 },
            {
              ...current,
              version: current.version + 3,
              identity: {
                ...current.identity,
                name: { ...current.identity.name, primary: 'Renamed' }
              }
            },
            'user-1'
          )
        ).rejects.toThrow(DomainStaleVersionException);

        expect(countSpy).toHaveBeenCalledTimes(1);
      } finally {
        countSpy.mockRestore();
      }
    });

    it('should allow clearing scientificName when set to null', async () => {
      const plant = PlantFactory.full();
      const current = plantDomainMapper.toPrimitives(plant);
      await repository.save(plant);

      const updated: PlantPrimitives = {
        ...current,
        identity: { ...current.identity, scientificName: null }
      };

      await repository.updateWithDiff(current, updated, 'user-1');

      const result = await findExisting(plant.id);

      expect(plant.identity.scientificName).toBeDefined();
      expect(result.identity.scientificName).toBeUndefined();
    });

    it('should NOT overwrite untouched fields', async () => {
      const plant = PlantFactory.random();
      const current = plantDomainMapper.toPrimitives(plant);
      await repository.save(plant);

      const originalHeight = plant.traits.size.height;
      const originalSpread = plant.traits.size.spread;

      const updated: PlantPrimitives = {
        ...current,
        identity: {
          ...current.identity,
          name: { ...current.identity.name, primary: random.name() }
        }
      };

      await repository.updateWithDiff(current, updated, 'user-1');

      const result = await findExisting(plant.id);

      expect(result.traits.size.height).toEqual(originalHeight);
      expect(result.traits.size.spread).toEqual(originalSpread);
    });

    it('should update nested size partially', async () => {
      const plant = PlantFactory.random();
      const current = plantDomainMapper.toPrimitives(plant);
      await repository.save(plant);

      const updated: PlantPrimitives = {
        ...current,
        traits: {
          ...current.traits,
          size: {
            ...current.traits.size,
            height: { ...current.traits.size.height, max: 999 }
          }
        }
      };

      await repository.updateWithDiff(current, updated, 'user-1');

      const result = await findExisting(plant.id);

      expect(result.traits.size.height.min).toBe(plant.traits.size.height.min);
      expect(result.traits.size.height.max).toBe(999);
      expect(result.traits.size.spread.min).toBe(plant.traits.size.spread.min);
      expect(result.traits.size.spread.max).toBe(plant.traits.size.spread.max);
    });

    it('should update metadata on every update', async () => {
      const plant = PlantFactory.random();
      const current = plantDomainMapper.toPrimitives(plant);
      await repository.save(plant);

      const updated: PlantPrimitives = {
        ...current,
        identity: {
          ...current.identity,
          name: { ...current.identity.name, primary: random.name() }
        }
      };

      await repository.updateWithDiff(current, updated, 'user-1');

      const result = await findExisting(plant.id);

      expect(result.metadata.updatedBy).toBe('user-1');
    });

    it("should not update metadata's createdBy on update", async () => {
      const plant = PlantFactory.random();
      const current = plantDomainMapper.toPrimitives(plant);
      await repository.save(plant);

      const originalCreatedBy = plant.metadata.createdBy;

      const updated: PlantPrimitives = {
        ...current,
        identity: {
          ...current.identity,
          name: { ...current.identity.name, primary: 'Different name' }
        }
      };

      await repository.updateWithDiff(current, updated, 'user-1');

      const result = await findExisting(plant.id);

      expect(result.metadata.createdBy).toBe(originalCreatedBy);
    });

    it('should not update metadata if there are no changes', async () => {
      const plant = PlantFactory.random();
      const current = plantDomainMapper.toPrimitives(plant);
      await repository.save(plant);

      const originalMetadata = plant.metadata;

      await repository.updateWithDiff(current, { ...current }, 'user-1');

      const result = await findExisting(plant.id);

      expect(result.metadata).toEqual(originalMetadata);
    });

    it('should handle non-existent plant on update', async () => {
      const plant = PlantFactory.random();
      const current = plantDomainMapper.toPrimitives(plant);

      const updated: PlantPrimitives = {
        ...current,
        identity: {
          ...current.identity,
          name: { ...current.identity.name, primary: 'New name' }
        }
      };

      await expect(
        repository.updateWithDiff(current, updated, 'user-1')
      ).rejects.toThrow(`Plant not found: ${plant.id}`);
    });

    it('should throw DomainNotFoundException when updating a soft-deleted plant', async () => {
      const plant = PlantFactory.random();
      plant.markAsDeleted();
      const current = plantDomainMapper.toPrimitives(plant);

      await repository.save(plant);

      const updated: PlantPrimitives = {
        ...current,
        identity: {
          ...current.identity,
          name: { ...current.identity.name, primary: 'Updated Name' }
        }
      };

      await expect(
        repository.updateWithDiff(current, updated, 'test-user')
      ).rejects.toThrow(DomainNotFoundException);

      await expect(
        repository.updateWithDiff(current, updated, 'test-user')
      ).rejects.toThrow(`Plant not found: ${plant.id}`);

      const storedPlant = await findExisting(plant.id);
      expect(storedPlant.identity.name.primary).toBe(
        plant.identity.name.primary
      );
    });
  });
  describe('exists', () => {
    it('should return true if plant exists', async () => {
      const plant = PlantFactory.random();

      await repository.save(plant);

      const exists = await repository.exists(plant.id);

      expect(exists).toBe(true);
    });

    it("should return false if plant doesn't exist", async () => {
      const exists = await repository.exists('non-existing-id');

      expect(exists).toBe(false);
    });
  });

  describe('findAll', () => {
    it('should return all plants', async () => {
      const plant1 = PlantFactory.random();

      const plant2 = PlantFactory.random();

      await repository.save(plant1);
      await repository.save(plant2);

      const { data } = await repository.findAll({});

      expect(data).toHaveLength(2);
    });

    it('should return paginated plants', async () => {
      for (let i = 0; i < 10; i++) {
        const plant = PlantFactory.random();
        await repository.save(plant);
      }

      const { data, pagination } = await repository.findAll({
        pagination: { page: 2, limit: 3 }
      });

      expect(data).toHaveLength(3);
      expect(pagination).toEqual({
        page: 2,
        limit: 3,
        totalPages: 4,
        totalItems: 10
      });
    });
  });
});
