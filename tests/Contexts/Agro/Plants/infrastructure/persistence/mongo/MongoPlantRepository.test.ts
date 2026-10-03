import { Collection, type MongoClient, MongoServerError } from 'mongodb';
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
  DomainConflictException,
  DomainNotFoundException,
  DomainStaleVersionException
} from '../../../../../../../src/Contexts/shared/domain/errors/index.js';
import type { EnvironmentArranger } from '../../../../../../../src/shared/infrastructure/arranger/EnvironmentArranger.js';
import {
  DBClientFactory,
  DBConfigFactory
} from '../../../../../../../src/shared/infrastructure/persistence/index.js';
import { SOURCE_ROOT } from '../../../../../../shared/sourceRoot.js';
import { random } from '../../../../../shared/fixtures/random.js';
import { PlantFactory } from '../../../domain/mothers/PlantFactory.js';
import { PlantIdentityBuilder } from '../../../domain/mothers/PlantIdentityBuilder.js';

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

    container = await createAppContainer({
      db,
      client,
      sourceRoot: SOURCE_ROOT
    });
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
      plant.markAsDeleted('test-user');

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
      plant.markAsDeleted('test-user');

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

      await repository.updateWithDiff(current, updated);

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

      await repository.updateWithDiff(stale, renamed('First writer'));

      await expect(
        repository.updateWithDiff(stale, renamed('Second writer'))
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
      await repository.updateWithDiff(current, {
        ...current,
        identity: {
          ...current.identity,
          name: { ...current.identity.name, primary: 'Legacy rename' }
        }
      });

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
        await repository.updateWithDiff(current, {
          ...current,
          identity: {
            ...current.identity,
            name: { ...current.identity.name, primary: 'Renamed' }
          }
        });

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
            }
          )
        ).rejects.toThrow(DomainStaleVersionException);

        expect(countSpy).toHaveBeenCalledTimes(1);
      } finally {
        countSpy.mockRestore();
      }
    });

    it('should throw DomainConflictException when the update hits a duplicate key error', async () => {
      const plant = PlantFactory.random();
      await repository.save(plant);
      const current = plantDomainMapper.toPrimitives(plant);
      const updateSpy = jest
        .spyOn(Collection.prototype, 'updateOne')
        .mockRejectedValueOnce(
          new MongoServerError({
            code: 11000,
            errmsg: 'duplicate key',
            keyValue: { 'identity.scientificName': 'Plantus repeatus' }
          })
        );

      try {
        await expect(
          repository.updateWithDiff(current, {
            ...current,
            identity: {
              ...current.identity,
              scientificName: 'Plantus repeatus'
            }
          })
        ).rejects.toThrow(DomainConflictException);
      } finally {
        updateSpy.mockRestore();
      }
    });

    it('should remove an optional field left out of the update', async () => {
      const plant = PlantFactory.full({
        identity: PlantIdentityBuilder.withAliases()
      });
      const current = plantDomainMapper.toPrimitives(plant);
      await repository.save(plant);

      const { aliases: _removed, ...name } = current.identity.name;
      const updated: PlantPrimitives = {
        ...current,
        identity: { ...current.identity, name }
      };

      await repository.updateWithDiff(current, updated);

      const result = await findExisting(plant.id);

      expect(plant.identity.name.aliases).toBeDefined();
      expect(result.identity.name.aliases).toBeUndefined();
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

      await repository.updateWithDiff(current, updated);

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

      await repository.updateWithDiff(current, updated);

      const result = await findExisting(plant.id);

      expect(result.traits.size.height.min).toBe(plant.traits.size.height.min);
      expect(result.traits.size.height.max).toBe(999);
      expect(result.traits.size.spread.min).toBe(plant.traits.size.spread.min);
      expect(result.traits.size.spread.max).toBe(plant.traits.size.spread.max);
    });

    it('stores the audit metadata it receives, adds none of its own and reports it wrote', async () => {
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

      const outcome = await repository.updateWithDiff(current, updated);

      const result = await findExisting(plant.id);

      expect(plantDomainMapper.toPrimitives(result)).toEqual({
        ...updated,
        version: current.version + 1
      });
      expect(outcome).toBe('written');
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

      await repository.updateWithDiff(current, updated);

      const result = await findExisting(plant.id);

      expect(result.metadata.createdBy).toBe(originalCreatedBy);
    });

    it('should not update metadata if there are no changes', async () => {
      const plant = PlantFactory.random();
      const current = plantDomainMapper.toPrimitives(plant);
      await repository.save(plant);

      const originalMetadata = plant.metadata;

      await repository.updateWithDiff(current, { ...current });

      const result = await findExisting(plant.id);

      expect(result.metadata).toEqual(originalMetadata);
    });

    describe('empty diff', () => {
      it('reports unchanged and writes nothing when the plant is active at the expected version', async () => {
        const plant = PlantFactory.random();
        const current = plantDomainMapper.toPrimitives(plant);
        await repository.save(plant);

        const outcome = await repository.updateWithDiff(current, {
          ...current
        });

        const result = await findExisting(plant.id);
        expect(outcome).toBe('unchanged');
        expect(plantDomainMapper.toPrimitives(result)).toEqual(current);
      });

      it('throws DomainStaleVersionException when the stored version moved', async () => {
        const plant = PlantFactory.random();
        const stale = plantDomainMapper.toPrimitives(plant);
        await repository.save(plant);
        await repository.updateWithDiff(stale, {
          ...stale,
          identity: {
            ...stale.identity,
            name: { ...stale.identity.name, primary: 'Moved' }
          }
        });

        await expect(
          repository.updateWithDiff(stale, { ...stale })
        ).rejects.toThrow(DomainStaleVersionException);
      });

      it('throws DomainNotFoundException when the plant was soft-deleted', async () => {
        const plant = PlantFactory.random();
        const current = plantDomainMapper.toPrimitives(plant);
        plant.markAsDeleted('test-user');
        await repository.save(plant);

        await expect(
          repository.updateWithDiff(current, { ...current })
        ).rejects.toThrow(DomainNotFoundException);
      });

      it('throws DomainNotFoundException when the plant does not exist', async () => {
        const current = plantDomainMapper.toPrimitives(PlantFactory.random());

        await expect(
          repository.updateWithDiff(current, { ...current })
        ).rejects.toThrow(DomainNotFoundException);
      });
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

      await expect(repository.updateWithDiff(current, updated)).rejects.toThrow(
        `Plant not found: ${plant.id}`
      );
    });

    it('should throw DomainNotFoundException when updating a soft-deleted plant', async () => {
      const plant = PlantFactory.random();
      plant.markAsDeleted('test-user');
      const current = plantDomainMapper.toPrimitives(plant);

      await repository.save(plant);

      const updated: PlantPrimitives = {
        ...current,
        identity: {
          ...current.identity,
          name: { ...current.identity.name, primary: 'Updated Name' }
        }
      };

      await expect(repository.updateWithDiff(current, updated)).rejects.toThrow(
        DomainNotFoundException
      );

      await expect(repository.updateWithDiff(current, updated)).rejects.toThrow(
        `Plant not found: ${plant.id}`
      );

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

    describe('sort by public keys', () => {
      const primaryNamesOf = (plants: Plant[]): string[] =>
        plants.map((plant) => plant.identity.name.primary);

      const saveNamed = async (
        names: ReadonlyArray<readonly [string, string]>
      ): Promise<void> => {
        for (const [primary, scientificName] of names) {
          await repository.save(
            PlantFactory.random({
              identity: PlantIdentityBuilder.named(primary, scientificName)
            })
          );
        }
      };

      it('should order by primary name, ignoring case', async () => {
        // Arrange
        await saveNamed([
          ['Tomate', 'Solanum lycopersicum'],
          ['apio', 'Apium graveolens'],
          ['Berenjena', 'Solanum melongena']
        ]);

        // Act
        const { data } = await repository.findAll({ sort: { name: 'asc' } });

        // Assert
        expect(primaryNamesOf(data)).toEqual(['apio', 'Berenjena', 'Tomate']);
      });

      it('should order by scientific name in reverse', async () => {
        // Arrange
        await saveNamed([
          ['Apio', 'Apium graveolens'],
          ['Tomate', 'Solanum lycopersicum'],
          ['Lechuga', 'Lactuca sativa']
        ]);

        // Act
        const { data } = await repository.findAll({
          sort: { scientificName: 'desc' }
        });

        // Assert
        expect(primaryNamesOf(data)).toEqual(['Tomate', 'Lechuga', 'Apio']);
      });
    });
  });
});
