import { Collection, type MongoClient } from 'mongodb';
import {
  type AppContainer,
  createAppContainer
} from '../../../../../../../src/apps/agroApi/container.js';
import { randomFamilyId } from '../../../../../../../src/Contexts/Agro/Families/domain/FamilyId.js';
import type { FamilyRepository } from '../../../../../../../src/Contexts/Agro/Families/domain/repositories/interfaces/FamilyRepository.js';
import type { FamilyPrimitives } from '../../../../../../../src/Contexts/Agro/Families/domain/types/FamilyPrimitives.js';
import { familyDomainMapper } from '../../../../../../../src/Contexts/Agro/Families/mappers/familyDomainMapper.js';
import {
  DomainNotFoundException,
  DomainStaleVersionException
} from '../../../../../../../src/Contexts/shared/domain/errors/index.js';
import type { EnvironmentArranger } from '../../../../../../../src/shared/infrastructure/arranger/EnvironmentArranger.js';
import {
  DBClientFactory,
  DBConfigFactory
} from '../../../../../../../src/shared/infrastructure/persistence/index.js';
import { FamilyScenarios } from '../../../domain/mothers/FamilyScenarios.js';

let container: AppContainer;
let repository: FamilyRepository;
let environmentArranger: Promise<EnvironmentArranger>;
let client: MongoClient;

describe('MongoFamilyRepository', () => {
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
    repository = container.resolve<FamilyRepository>('familyRepository');
  });
  beforeEach(async () => {
    await (await environmentArranger).arrange();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await (await environmentArranger).arrange();
    await (await environmentArranger).close();
    await client.close();
  });

  describe('save + findById', () => {
    it('should save and retrieve a family', async () => {
      const family = FamilyScenarios.domainRandom();

      await repository.save(family);

      const found = await repository.findById(family.idValue);

      expect(found).not.toBeNull();
      expect(found && familyDomainMapper.toPrimitives(found)).toEqual(
        familyDomainMapper.toPrimitives(family)
      );
    });

    it('should return null if family does not exist', async () => {
      await expect(repository.findById(randomFamilyId())).resolves.toBeNull();
    });

    it('should reject with the driver error instead of returning null', async () => {
      const error = new Error('driver failure');
      jest.spyOn(Collection.prototype, 'findOne').mockRejectedValueOnce(error);

      await expect(repository.findById(randomFamilyId())).rejects.toBe(error);
    });

    it('should return the correct family among multiple entries', async () => {
      const family1 = FamilyScenarios.domainRandom();

      const family2 = FamilyScenarios.domainRandom();

      await repository.save(family1);
      await repository.save(family2);

      const found1 = await repository.findById(family1.idValue);
      const found2 = await repository.findById(family2.idValue);

      expect(found1?.idValue).toBe(family1.idValue);
      expect(found2?.idValue).toBe(family2.idValue);
    });
  });

  describe('findBySlug', () => {
    it('should return null if family does not exist', async () => {
      await expect(
        repository.findBySlug('non-existing-slug')
      ).resolves.toBeNull();
    });

    it('should return the family when the slug exists', async () => {
      const family = FamilyScenarios.domainRandom();
      await repository.save(family);

      const found = await repository.findBySlug(family.slug);

      expect(found).not.toBeNull();
      expect(found && familyDomainMapper.toPrimitives(found)).toEqual(
        familyDomainMapper.toPrimitives(family)
      );
    });

    it('should reject with the driver error instead of returning null', async () => {
      const error = new Error('driver failure');
      jest.spyOn(Collection.prototype, 'findOne').mockRejectedValueOnce(error);

      await expect(repository.findBySlug('any-slug')).rejects.toBe(error);
    });

    it('should return the correct family among multiple entries', async () => {
      const family1 = FamilyScenarios.domainRandom();

      const family2 = FamilyScenarios.domainRandom();

      await repository.save(family1);
      await repository.save(family2);

      const found1 = await repository.findBySlug(family1.slug);
      const found2 = await repository.findBySlug(family2.slug);

      expect(found1?.idValue).toBe(family1.idValue);
      expect(found2?.idValue).toBe(family2.idValue);
    });
  });

  describe('updateWithDiff', () => {
    it('should update family with diff', async () => {
      const family = FamilyScenarios.domainRandom();
      await repository.save(family);
      const before = familyDomainMapper.toPrimitives(family);

      const updateDto = {
        name: 'Updated name',
        slug: 'updated-slug',
        scientificName: 'Updated scientific name',
        shortDescription: 'Updated short description',
        highlights: ['h1', 'h2'],
        aliases: ['a1', 'a2']
      };

      await repository.updateWithDiff(before, { ...before, ...updateDto });

      const updated = await repository.findById(family.idValue);

      expect(updated?.name).toBe(updateDto.name);
      expect(updated?.slug).toBe(updateDto.slug);
      expect(updated?.scientificName).toBe(updateDto.scientificName);
      expect(updated?.shortDescription).toBe(updateDto.shortDescription);
      expect(updated?.highlights).toEqual(updateDto.highlights);
      expect(updated?.aliases).toEqual(updateDto.aliases);
    });

    it('should throw DomainStaleVersionException when updating from a stale version', async () => {
      const family = FamilyScenarios.domainRandom();
      await repository.save(family);
      const stale = familyDomainMapper.toPrimitives(family);

      await repository.updateWithDiff(stale, {
        ...stale,
        name: 'First writer'
      });

      await expect(
        repository.updateWithDiff(stale, { ...stale, name: 'Second writer' })
      ).rejects.toThrow(DomainStaleVersionException);

      const stored = await repository.findById(family.idValue);
      expect(stored?.name).toBe('First writer');
      expect(stored?.version).toBe(stale.version + 1);
    });

    it('stores the audit metadata it receives and adds none of its own', async () => {
      const family = FamilyScenarios.domainRandom();
      await repository.save(family);
      const before = familyDomainMapper.toPrimitives(family);

      const outcome = await repository.updateWithDiff(before, {
        ...before,
        name: 'Another name'
      });

      const updated = await repository.findById(family.idValue);

      expect(updated && familyDomainMapper.toPrimitives(updated)).toEqual({
        ...before,
        name: 'Another name',
        version: before.version + 1
      });
      expect(outcome).toBe('written');
    });

    describe('empty diff', () => {
      it('reports unchanged and writes nothing when the family is at the expected version', async () => {
        const family = FamilyScenarios.domainRandom();
        await repository.save(family);
        const before = familyDomainMapper.toPrimitives(family);

        const outcome = await repository.updateWithDiff(before, { ...before });

        const stored = await repository.findById(family.idValue);
        expect(outcome).toBe('unchanged');
        expect(stored && familyDomainMapper.toPrimitives(stored)).toEqual(
          before
        );
      });

      it('throws DomainStaleVersionException when the stored version moved', async () => {
        const family = FamilyScenarios.domainRandom();
        await repository.save(family);
        const stale = familyDomainMapper.toPrimitives(family);
        await repository.updateWithDiff(stale, { ...stale, name: 'Moved' });

        await expect(
          repository.updateWithDiff(stale, { ...stale })
        ).rejects.toThrow(DomainStaleVersionException);
      });

      it('throws DomainNotFoundException when the family does not exist', async () => {
        const missing = familyDomainMapper.toPrimitives(
          FamilyScenarios.domainRandom()
        );

        await expect(
          repository.updateWithDiff(missing, { ...missing })
        ).rejects.toThrow(DomainNotFoundException);
      });
    });

    it('should throw not found error if family does not exist', async () => {
      const nonExistingFamily = FamilyScenarios.domainRandom({
        id: randomFamilyId()
      });

      const primitives = familyDomainMapper.toPrimitives(nonExistingFamily);
      await expect(
        repository.updateWithDiff(primitives, { ...primitives, name: 'Name' })
      ).rejects.toThrow(`Family not found: ${nonExistingFamily.idValue}`);
    });

    it('should update an existing family (regression: activeFilter default is empty)', async () => {
      const family = FamilyScenarios.domainRandom();
      await repository.save(family);

      const newName = 'Regression Test Family';
      const primitives = familyDomainMapper.toPrimitives(family);
      await repository.updateWithDiff(primitives, {
        ...primitives,
        name: newName
      });

      const updated = await repository.findById(family.idValue);
      expect(updated?.name).toBe(newName);
    });

    it('removes an optional field absent from updated and leaves version incremented by 1', async () => {
      const family = FamilyScenarios.domainBaseWithExtra();
      await repository.save(family);

      const before = familyDomainMapper.toPrimitives(family);
      const { extra: _extra, ...afterWithoutExtra } = before;
      const after = afterWithoutExtra as FamilyPrimitives;

      await repository.updateWithDiff(before, after);

      const updated = await repository.findById(family.idValue);

      expect(updated?.extra).toBeUndefined();
      expect(updated?.version).toBe(before.version + 1);
    });

    it('leaves a field untouched when absent from both current and updated', async () => {
      const family = FamilyScenarios.domainRandom();
      await repository.save(family);

      const before = familyDomainMapper.toPrimitives(family);
      const after = { ...before };

      await repository.updateWithDiff(before, { ...after, name: 'Changed' });

      const updated = await repository.findById(family.idValue);

      expect(updated?.extra).toBeUndefined();
    });
  });

  describe('exists', () => {
    it('should return true if family exists', async () => {
      const family = FamilyScenarios.domainRandom();
      await repository.save(family);

      const exists = await repository.exists(family.idValue);

      expect(exists).toBe(true);
    });

    it("should return false if family doesn't exist", async () => {
      const exists = await repository.exists('non-existing-id');

      expect(exists).toBe(false);
    });
  });

  describe('findAll', () => {
    it('should return all families', async () => {
      const family1 = FamilyScenarios.domainRandom();
      const family2 = FamilyScenarios.domainRandom();

      await repository.save(family1);
      await repository.save(family2);

      const { data } = await repository.findAll();

      expect(data).toHaveLength(2);
      expect(data.some((f) => f.idValue === family1.idValue)).toBe(true);
      expect(data.some((f) => f.idValue === family2.idValue)).toBe(true);
    });

    it('should return empty array if no families exist', async () => {
      const { data } = await repository.findAll();

      expect(data).toEqual([]);
    });

    it('should filter by id', async () => {
      const family1 = FamilyScenarios.domainRandom();
      const family2 = FamilyScenarios.domainRandom();

      await repository.save(family1);
      await repository.save(family2);

      const { data } = await repository.findAll({
        filter: {
          id: { eq: family2.idValue }
        }
      });

      expect(data).toHaveLength(1);
      expect(data[0]?.idValue).toBe(family2.idValue);
    });

    it('should filter by id with in operator', async () => {
      const family1 = FamilyScenarios.domainRandom();
      const family2 = FamilyScenarios.domainRandom();
      const family3 = FamilyScenarios.domainRandom();

      await repository.save(family1);
      await repository.save(family2);
      await repository.save(family3);

      const { data } = await repository.findAll({
        filter: {
          id: { in: [family1.idValue, family3.idValue] }
        }
      });

      expect(data).toHaveLength(2);
      expect(data.map((f) => f.idValue)).toEqual(
        expect.arrayContaining([family1.idValue, family3.idValue])
      );
    });

    it('should ignore empty filter object', async () => {
      const family1 = FamilyScenarios.domainRandom();

      await repository.save(family1);

      const { data } = await repository.findAll({
        filter: {
          name: {}
        }
      });

      expect(data.length).toBeGreaterThanOrEqual(1);
    });

    it('should apply filter options', async () => {
      const family1 = FamilyScenarios.domainRandom({ name: 'Rose' });
      const family2 = FamilyScenarios.domainRandom({ name: 'Tulip' });

      await repository.save(family1);
      await repository.save(family2);

      const { data } = await repository.findAll({
        filter: {
          name: { eq: 'Tulip' }
        }
      });

      expect(data).toHaveLength(1);
      expect(data[0]?.idValue).toBe(family2.idValue);
    });

    it('should apply contains filter', async () => {
      const family1 = FamilyScenarios.domainRandom({ name: 'Rose Garden' });
      const family2 = FamilyScenarios.domainRandom({ name: 'Tulip' });

      await repository.save(family1);
      await repository.save(family2);

      const { data } = await repository.findAll({
        filter: {
          name: { contains: 'Rose' }
        }
      });

      expect(data).toHaveLength(1);
      expect(data[0]?.idValue).toBe(family1.idValue);
    });

    it('should apply startsWith filter', async () => {
      const family1 = FamilyScenarios.domainRandom({ name: 'Rose Alba' });
      const family2 = FamilyScenarios.domainRandom({ name: 'Tulip Alba' });

      await repository.save(family1);
      await repository.save(family2);

      const { data } = await repository.findAll({
        filter: {
          name: { startsWith: 'Rose' }
        }
      });

      expect(data).toHaveLength(1);
    });

    it('should apply in filter for arrays', async () => {
      const family1 = FamilyScenarios.domainRandom({ name: 'Rose' });
      const family2 = FamilyScenarios.domainRandom({ name: 'Tulip' });
      const family3 = FamilyScenarios.domainRandom({ name: 'Lily' });

      await repository.save(family1);
      await repository.save(family2);
      await repository.save(family3);

      const { data } = await repository.findAll({
        filter: {
          name: { in: ['Rose', 'Lily'] }
        }
      });

      expect(data).toHaveLength(2);
    });

    it('should filter by aliases contains value', async () => {
      const family1 = FamilyScenarios.domainRandom({
        aliases: ['rosa', 'flor']
      });

      const family2 = FamilyScenarios.domainRandom({
        aliases: ['tulip']
      });

      await repository.save(family1);
      await repository.save(family2);

      const { data } = await repository.findAll({
        filter: {
          aliases: { has: 'rosa' }
        }
      });

      expect(data).toHaveLength(1);
      expect(data[0]?.idValue).toBe(family1.idValue);
    });

    it('should combine multiple filters correctly', async () => {
      const family1 = FamilyScenarios.domainRandom({
        name: 'Rose',
        scientificName: 'Rosa rubiginosa'
      });

      const family2 = FamilyScenarios.domainRandom({
        name: 'Rose',
        scientificName: 'Something else'
      });

      await repository.save(family1);
      await repository.save(family2);

      const { data } = await repository.findAll({
        filter: {
          name: { eq: 'Rose' },
          scientificName: { contains: 'rubiginosa' }
        }
      });

      expect(data).toHaveLength(1);
      expect(data[0]?.idValue).toBe(family1.idValue);
    });

    it('should apply pagination options', async () => {
      const family1 = FamilyScenarios.domainRandom();
      const family2 = FamilyScenarios.domainRandom();
      const family3 = FamilyScenarios.domainRandom();

      await repository.save(family1);
      await repository.save(family2);
      await repository.save(family3);

      const { data } = await repository.findAll({
        pagination: {
          page: 2,
          limit: 1
        }
      });

      expect(data).toHaveLength(1);
      expect(data[0]?.idValue).toBe(family2.idValue);
    });

    it('should return empty array when page is out of range', async () => {
      const family1 = FamilyScenarios.domainRandom();
      await repository.save(family1);

      const { data } = await repository.findAll({
        pagination: {
          page: 99,
          limit: 10
        }
      });

      expect(data).toEqual([]);
    });

    it('should handle limit = 0', async () => {
      const family1 = FamilyScenarios.domainRandom();
      await repository.save(family1);

      await expect(
        repository.findAll({
          pagination: {
            page: 1,
            limit: 0
          }
        })
      ).rejects.toThrow('pagination.limit must be greater than 0');
    });

    it('should apply pagination correctly across pages', async () => {
      const families = Array.from({ length: 5 }, () =>
        FamilyScenarios.domainRandom()
      );

      await Promise.allSettled(families.map((f) => repository.save(f)));

      const page1 = await repository.findAll({
        pagination: { page: 1, limit: 2 }
      });

      const page2 = await repository.findAll({
        pagination: { page: 2, limit: 2 }
      });

      expect(page1.data).toHaveLength(2);
      expect(page2.data).toHaveLength(2);
    });

    it('should sort by name ascending', async () => {
      const b = FamilyScenarios.domainRandom({ name: 'B' });
      const a = FamilyScenarios.domainRandom({ name: 'A' });

      await repository.save(b);
      await repository.save(a);

      const { data } = await repository.findAll({
        sort: {
          name: 'asc'
        }
      });

      expect(data[0]?.name).toBe('A');
    });

    it('should sort by multiple fields', async () => {
      const b = FamilyScenarios.domainRandom({
        name: 'A',
        scientificName: 'Z'
      });
      const a = FamilyScenarios.domainRandom({
        name: 'A',
        scientificName: 'A'
      });

      await repository.save(b);
      await repository.save(a);

      const { data } = await repository.findAll({
        sort: {
          name: 'asc',
          scientificName: 'asc'
        }
      });

      expect(data[0]?.name).toBe('A');
      expect(data[0]?.scientificName).toBe('A');
    });
  });
});
