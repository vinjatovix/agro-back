import type { MongoClient } from 'mongodb';
import {
  createAppContainer,
  type AppContainer
} from '../../../../../../../src/apps/agroApi/container.js';
import type { BedPrimitives } from '../../../../../../../src/Contexts/Agro/Beds/domain/entities/types/BedPrimitives.js';
import type { BedRepository } from '../../../../../../../src/Contexts/Agro/Beds/domain/repositories/interfaces/BedRepository.js';
import { bedDomainMapper } from '../../../../../../../src/Contexts/Agro/Beds/mappers/bedDomainMapper.js';
import type { EnvironmentArranger } from '../../../../../../../src/shared/infrastructure/arranger/EnvironmentArranger.js';
import {
  DBClientFactory,
  DBConfigFactory
} from '../../../../../../../src/shared/infrastructure/persistence/index.js';
import { PlantInstanceMother } from '../../../../PlantInstances/domain/mothers/PlantInstanceMother.js';
import { BedFactory } from '../../../domain/mothers/BedFactory.js';
import { random } from '../../../../../shared/fixtures/random.js';

let container: AppContainer;
let repository: BedRepository;
let environmentArranger: Promise<EnvironmentArranger>;
let client: MongoClient;

describe('MongoBedRepository', () => {
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
    repository = container.resolve<BedRepository>('bedRepository');
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
    it('should save and retrieve a bed', async () => {
      const bed = BedFactory.create();

      await repository.save(bed);

      const found = await repository.findById(bed.id.value);

      expect(found.id.value).toBe(bed.id.value);
      expect(found.width.value).toBe(bed.width.value);
      expect(found.height.value).toBe(bed.height.value);
      expect(found.name.value).toBe(bed.name.value);
      expect(found.plantInstances).toEqual(bed.plantInstances);
    });

    it('should throw not found error if bed does not exist', async () => {
      await expect(repository.findById('non-existing-id')).rejects.toThrow(
        'Bed not found: non-existing-id'
      );
    });

    it('should return the correct bed among multiple entries', async () => {
      const bed1 = BedFactory.create();

      const bed2 = BedFactory.create();

      await repository.save(bed1);
      await repository.save(bed2);

      const found1 = await repository.findById(bed1.id.value);
      const found2 = await repository.findById(bed2.id.value);

      expect(found1.id.value).toBe(bed1.id.value);
      expect(found2.id.value).toBe(bed2.id.value);
    });
  });

  describe('exists', () => {
    it('should return true if bed exists', async () => {
      const bed = BedFactory.create();

      await repository.save(bed);

      const exists = await repository.exists(bed.id.value);

      expect(exists).toBe(true);
    });

    it("should return false if bed doesn't exist", async () => {
      const exists = await repository.exists('non-existing-id');

      expect(exists).toBe(false);
    });
  });

  describe('updateWithDiff', () => {
    it('should update bed dimensions', async () => {
      const bed = BedFactory.random();
      const current = bedDomainMapper.toPrimitives(bed);

      await repository.save(bed);

      const updated = {
        id: bed.id.value,
        width: bed.width.value + 100,
        height: bed.height.value + 100
      } as unknown as BedPrimitives;

      await repository.updateWithDiff(current, updated, 'test-user');

      const found = await repository.findById(bed.id.value);

      expect(found.width.value).toBe(updated.width);
      expect(found.height.value).toBe(updated.height);
    });

    it('should update plant instances', async () => {
      const bed = BedFactory.create();
      const current = bedDomainMapper.toPrimitives(bed);

      await repository.save(bed);

      const newPlant = PlantInstanceMother.atPosition(10, 20);

      const updated = {
        id: bed.id.value,
        userId: bed.userId.value,
        name: bed.name.value,
        width: bed.width.value,
        depth: bed.depth.value,
        height: bed.height.value,
        plantInstances: [...current.plantInstances, newPlant.toPrimitives()],
        metadata: current.metadata,
        deleted: current.deleted,
        ...(current.deletedAt && { deletedAt: current.deletedAt })
      } satisfies BedPrimitives;

      await repository.updateWithDiff(current, updated, 'test-user');

      const found = await repository.findById(updated.id);

      expect(found.plantInstances).toHaveLength(
        current.plantInstances.length + 1
      );
      expect(found.plantInstances).toContainEqual(newPlant);
    });
  });

  describe('findByUserId', () => {
    it('should find beds by user id', async () => {
      const bed1 = BedFactory.create();
      const bed2 = BedFactory.create();

      await repository.save(bed1);
      await repository.save(bed2);

      const found = await repository.findByUserId(bed1.userId.value);

      expect(found).toHaveLength(1);
      expect(found[0]?.id.value).toBe(bed1.id.value);
    });

    it('should return empty array if user has no beds', async () => {
      const found = await repository.findByUserId(random.uuid());

      expect(found).toEqual([]);
    });
  });
});
