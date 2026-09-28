import { Collection, type MongoClient } from 'mongodb';
import {
  type AppContainer,
  createAppContainer
} from '../../../../../../../src/apps/agroApi/container.js';
import { randomBedId } from '../../../../../../../src/Contexts/Agro/Beds/domain/BedId.js';
import type { Bed } from '../../../../../../../src/Contexts/Agro/Beds/domain/entities/Bed.js';
import type { BedPrimitives } from '../../../../../../../src/Contexts/Agro/Beds/domain/entities/types/BedPrimitives.js';
import type { BedRepository } from '../../../../../../../src/Contexts/Agro/Beds/domain/repositories/interfaces/BedRepository.js';
import { bedDomainMapper } from '../../../../../../../src/Contexts/Agro/Beds/mappers/bedDomainMapper.js';
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
import { random } from '../../../../../shared/fixtures/random.js';
import { PlantInstanceMother } from '../../../../PlantInstances/domain/mothers/PlantInstanceMother.js';
import { BedFactory } from '../../../domain/mothers/BedFactory.js';

let container: AppContainer;
let repository: BedRepository;
let environmentArranger: Promise<EnvironmentArranger>;
let client: MongoClient;

async function findExisting(id: string): Promise<Bed> {
  const found = await repository.findById(id);

  if (found === null) {
    throw new Error('Expected the bed to exist');
  }

  return found;
}

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

      const found = await findExisting(bed.id);

      expect(found.id).toBe(bed.id);
      expect(found.width.value).toBe(bed.width.value);
      expect(found.height.value).toBe(bed.height.value);
      expect(found.name.value).toBe(bed.name.value);
      expect(found.plantInstances).toEqual(bed.plantInstances);
    });

    it('should return the bed reconstructed as the saved one', async () => {
      const bed = BedFactory.random();

      await repository.save(bed);

      const found = await findExisting(bed.id);

      expect(bedDomainMapper.toPrimitives(found)).toMatchObject(
        bedDomainMapper.toPrimitives(bed)
      );
    });

    it('should return null if bed does not exist', async () => {
      await expect(repository.findById(randomBedId())).resolves.toBeNull();
    });

    it('should propagate infrastructure failures instead of returning null', async () => {
      const error = new Error('connection lost');
      const findOne = jest
        .spyOn(Collection.prototype, 'findOne')
        .mockRejectedValueOnce(error);

      try {
        await expect(repository.findById(randomBedId())).rejects.toBe(error);
      } finally {
        findOne.mockRestore();
      }
    });

    it('should return the correct bed among multiple entries', async () => {
      const bed1 = BedFactory.create();

      const bed2 = BedFactory.create();

      await repository.save(bed1);
      await repository.save(bed2);

      const found1 = await findExisting(bed1.id);
      const found2 = await findExisting(bed2.id);

      expect(found1.id).toBe(bed1.id);
      expect(found2.id).toBe(bed2.id);
    });
  });

  describe('findOwnedActiveById', () => {
    it('should return the bed when it is active and owned by the user', async () => {
      const bed = BedFactory.create();

      await repository.save(bed);

      const found = await repository.findOwnedActiveById(bed.id, bed.userId);

      expect(found?.id).toBe(bed.id);
    });

    it('should return null when the bed belongs to another user', async () => {
      const bed = BedFactory.create();

      await repository.save(bed);

      await expect(
        repository.findOwnedActiveById(bed.id, random.uuid())
      ).resolves.toBeNull();
    });

    it('should return null when the bed is soft-deleted', async () => {
      const bed = BedFactory.create({ deleted: true, deletedAt: new Date() });

      await repository.save(bed);

      await expect(
        repository.findOwnedActiveById(bed.id, bed.userId)
      ).resolves.toBeNull();
    });

    it('should return null when the bed does not exist', async () => {
      await expect(
        repository.findOwnedActiveById(randomBedId(), random.uuid())
      ).resolves.toBeNull();
    });
  });

  describe('exists', () => {
    it('should return true if bed exists', async () => {
      const bed = BedFactory.create();

      await repository.save(bed);

      const exists = await repository.exists(bed.id);

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
        id: bed.id,
        width: bed.width.value + 100,
        height: bed.height.value + 100
      } as unknown as BedPrimitives;

      await repository.updateWithDiff(current, updated, 'test-user');

      const found = await findExisting(bed.id);

      expect(found.width.value).toBe(updated.width);
      expect(found.height.value).toBe(updated.height);
    });

    it('should update plant instances', async () => {
      const bed = BedFactory.create();
      const current = bedDomainMapper.toPrimitives(bed);

      await repository.save(bed);

      const newPlant = PlantInstanceMother.atPosition(10, 20);

      const updated = {
        id: bed.id,
        userId: bed.userId,
        name: bed.name.value,
        width: bed.width.value,
        depth: bed.depth.value,
        height: bed.height.value,
        plantInstances: [...current.plantInstances, newPlant.toPrimitives()],
        metadata: current.metadata,
        deleted: current.deleted,
        ...(current.deletedAt && { deletedAt: current.deletedAt }),
        version: current.version
      } satisfies BedPrimitives;

      await repository.updateWithDiff(current, updated, 'test-user');

      const found = await findExisting(updated.id);

      expect(found.plantInstances).toHaveLength(
        current.plantInstances.length + 1
      );
      expect(found.plantInstances).toContainEqual(newPlant);
    });

    it('should persist deletedAt as an ISO string when soft-deleting', async () => {
      const bed = BedFactory.create();
      const current = bedDomainMapper.toPrimitives(bed);

      await repository.save(bed);

      bed.markAsDeleted();
      const deleted = bedDomainMapper.toPrimitives(bed);

      await repository.updateWithDiff(current, deleted, 'test-user');

      const document = await client
        .db()
        .collection('beds')
        .findOne({ deleted: true });

      expect(typeof document?.deletedAt).toBe('string');
      expect(document?.deletedAt).toBe(bed.deletedAt?.toISOString());
    });

    it('should throw DomainNotFoundException when updating a soft-deleted bed', async () => {
      const bed = BedFactory.create({ deleted: true });
      const current = bedDomainMapper.toPrimitives(bed);

      await repository.save(bed);

      const updated = {
        ...current,
        name: 'Updated Name'
      } satisfies BedPrimitives;

      await expect(
        repository.updateWithDiff(current, updated, 'test-user')
      ).rejects.toThrow(DomainNotFoundException);

      await expect(
        repository.updateWithDiff(current, updated, 'test-user')
      ).rejects.toThrow(`Bed not found: ${bed.id}`);

      const storedBed = await repository.findById(bed.id);
      expect(storedBed?.name.value).toBe(bed.name.value);
    });

    it('should throw DomainNotFoundException when updating a non-existent bed', async () => {
      const bed = BedFactory.create();
      const current = bedDomainMapper.toPrimitives(bed);
      const updated = { ...current, name: 'Updated Name' };

      let thrownError: Error | undefined;
      try {
        await repository.updateWithDiff(current, updated, 'test-user');
      } catch (e) {
        thrownError = e as Error;
      }

      expect(thrownError).toBeInstanceOf(DomainNotFoundException);
      expect(thrownError?.message).toMatch(/Bed not found/);
      expect(thrownError?.message).toContain(current.id);

      const exists = await repository.exists(current.id);
      expect(exists).toBe(false);
    });

    it('should increment the version on every successful update', async () => {
      const bed = BedFactory.create();
      await repository.save(bed);

      const current = bedDomainMapper.toPrimitives(bed);
      await repository.updateWithDiff(
        current,
        { ...current, name: 'Updated Name' },
        'test-user'
      );

      const storedBed = await repository.findById(bed.id);
      expect(storedBed?.version).toBe(current.version + 1);
    });

    it('should update a bed stored without a version field', async () => {
      const bed = BedFactory.create();
      await repository.save(bed);
      await client
        .db()
        .collection('beds')
        .updateMany({}, { $unset: { version: '' } });

      const current = bedDomainMapper.toPrimitives(await findExisting(bed.id));
      await repository.updateWithDiff(
        current,
        { ...current, name: 'Updated Name' },
        'test-user'
      );

      const storedBed = await findExisting(bed.id);
      expect(current.version).toBe(0);
      expect(storedBed.name.value).toBe('Updated Name');
      expect(storedBed.version).toBe(1);
    });

    it('should throw DomainStaleVersionException when updating from a stale version', async () => {
      const bed = BedFactory.create();
      await repository.save(bed);

      const stale = bedDomainMapper.toPrimitives(bed);
      await repository.updateWithDiff(
        stale,
        { ...stale, name: 'First writer' },
        'test-user'
      );

      await expect(
        repository.updateWithDiff(
          stale,
          { ...stale, name: 'Second writer' },
          'test-user'
        )
      ).rejects.toThrow(DomainStaleVersionException);

      const storedBed = await repository.findById(bed.id);
      expect(storedBed?.name.value).toBe('First writer');
    });

    it('should not soft-delete a bed that received plants after it was read', async () => {
      const bed = BedFactory.create();
      await repository.save(bed);

      const readByDelete = bedDomainMapper.toPrimitives(bed);
      await repository.updateWithDiff(
        readByDelete,
        {
          ...readByDelete,
          plantInstances: [PlantInstanceMother.create().toPrimitives()]
        },
        'test-user'
      );

      bed.markAsDeleted();
      const deleted = bedDomainMapper.toPrimitives(bed);

      await expect(
        repository.updateWithDiff(readByDelete, deleted, 'test-user')
      ).rejects.toThrow(DomainStaleVersionException);

      const storedBed = await repository.findById(bed.id);
      expect(storedBed?.isDeleted).toBe(false);
      expect(storedBed?.plantInstances).toHaveLength(1);
    });

    it('should not report a stale version as a business conflict', async () => {
      const bed = BedFactory.create();
      await repository.save(bed);

      const stale = bedDomainMapper.toPrimitives(bed);
      await repository.updateWithDiff(
        stale,
        { ...stale, name: 'First writer' },
        'test-user'
      );

      await expect(
        repository.updateWithDiff(
          stale,
          { ...stale, name: 'Second writer' },
          'test-user'
        )
      ).rejects.not.toBeInstanceOf(DomainConflictException);
    });

    it('should throw DomainNotFoundException instead of a stale version for a soft-deleted bed', async () => {
      const bed = BedFactory.create();
      bed.markAsDeleted();
      await repository.save(bed);

      const current = bedDomainMapper.toPrimitives(bed);

      await expect(
        repository.updateWithDiff(
          { ...current, version: current.version + 5 },
          { ...current, version: current.version + 5, name: 'Other name' },
          'test-user'
        )
      ).rejects.toThrow(DomainNotFoundException);
    });

    it('should not bump the version when the diff is empty', async () => {
      const bed = BedFactory.create();
      await repository.save(bed);

      const current = bedDomainMapper.toPrimitives(bed);
      await repository.updateWithDiff(current, { ...current }, 'test-user');

      const storedBed = await findExisting(bed.id);
      expect(storedBed.version).toBe(current.version);
    });

    it('should not count documents after a successful conditional write', async () => {
      const bed = BedFactory.create();
      await repository.save(bed);
      const countSpy = jest.spyOn(Collection.prototype, 'countDocuments');

      try {
        const current = bedDomainMapper.toPrimitives(bed);
        await repository.updateWithDiff(
          current,
          { ...current, name: 'Updated Name' },
          'test-user'
        );

        expect(countSpy).not.toHaveBeenCalled();
      } finally {
        countSpy.mockRestore();
      }
    });

    it('should count documents exactly once after a failed conditional write', async () => {
      const bed = BedFactory.create();
      await repository.save(bed);

      const stale = bedDomainMapper.toPrimitives(bed);
      await repository.updateWithDiff(
        stale,
        { ...stale, name: 'First writer' },
        'test-user'
      );
      const countSpy = jest.spyOn(Collection.prototype, 'countDocuments');

      try {
        await expect(
          repository.updateWithDiff(
            stale,
            { ...stale, name: 'Second writer' },
            'test-user'
          )
        ).rejects.toThrow(DomainStaleVersionException);

        expect(countSpy).toHaveBeenCalledTimes(1);
      } finally {
        countSpy.mockRestore();
      }
    });
  });

  describe('findByUserId', () => {
    it('should find beds by user id', async () => {
      const bed1 = BedFactory.create();
      const bed2 = BedFactory.create();

      await repository.save(bed1);
      await repository.save(bed2);

      const found = await repository.findByUserId(bed1.userId);

      expect(found).toHaveLength(1);
      expect(found[0]?.id).toBe(bed1.id);
    });

    it('should return empty array if user has no beds', async () => {
      const found = await repository.findByUserId(random.uuid());

      expect(found).toEqual([]);
    });
  });
});
