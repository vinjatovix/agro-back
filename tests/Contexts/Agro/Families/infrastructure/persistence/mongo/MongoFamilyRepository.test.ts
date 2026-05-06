import {
  createAppContainer,
  type AppContainer
} from '../../../../../../../src/apps/agroApi/container.js';
import type { FamilyRepository } from '../../../../../../../src/Contexts/Agro/Families/domain/repositories/interfaces/FamilyRepository.js';
import type { FamilyPrimitives } from '../../../../../../../src/Contexts/Agro/Families/domain/types/FamilyPrimitives.js';
import { familyDomainMapper } from '../../../../../../../src/Contexts/Agro/Families/mappers/familyDomainMapper.js';
import type { EnvironmentArranger } from '../../../../../../../src/shared/infrastructure/arranger/EnvironmentArranger.js';
import { UuidMother } from '../../../../../shared/fixtures/UuidMother.js';
import { FamilyScenarios } from '../../../domain/mothers/FamilyScenarios.js';
import {
  DBClientFactory,
  DBConfigFactory
} from '../../../../../../../src/shared/infrastructure/persistence/index.js';
import type { MongoClient } from 'mongodb';

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

      expect(found.idValue).toBe(family.idValue);
      expect(found.name).toBe(family.name);
      expect(found.slug).toBe(family.slug);
      expect(found.scientificName).toBe(family.scientificName);
      expect(found.shortDescription).toBe(family.shortDescription);
      expect(found.highlights).toEqual(family.highlights);
      expect(found.aliases).toEqual(family.aliases);
    });

    it('should throw not found error if family does not exist', async () => {
      await expect(repository.findById('non-existing-id')).rejects.toThrow(
        'Family not found: non-existing-id'
      );
    });

    it('should return the correct family among multiple entries', async () => {
      const family1 = FamilyScenarios.domainRandom();

      const family2 = FamilyScenarios.domainRandom();

      await repository.save(family1);
      await repository.save(family2);

      const found1 = await repository.findById(family1.idValue);
      const found2 = await repository.findById(family2.idValue);

      expect(found1.idValue).toBe(family1.idValue);
      expect(found2.idValue).toBe(family2.idValue);
    });
  });

  describe('findBySlug', () => {
    it('should throw not found error if family does not exist', async () => {
      await expect(repository.findBySlug('non-existing-slug')).rejects.toThrow(
        'Family not found with slug: non-existing-slug'
      );
    });

    it('should return the correct family among multiple entries', async () => {
      const family1 = FamilyScenarios.domainRandom();

      const family2 = FamilyScenarios.domainRandom();

      await repository.save(family1);
      await repository.save(family2);

      const found1 = await repository.findBySlug(family1.slug);
      const found2 = await repository.findBySlug(family2.slug);

      expect(found1.idValue).toBe(family1.idValue);
      expect(found2.idValue).toBe(family2.idValue);
    });
  });

  describe('updateWithDiff', () => {
    it('should update family with diff', async () => {
      const family = FamilyScenarios.domainRandom();
      await repository.save(family);

      const updateDto = {
        name: 'Updated name',
        slug: 'updated-slug',
        scientificName: 'Updated scientific name',
        shortDescription: 'Updated short description',
        highlights: ['h1', 'h2'],
        aliases: ['a1', 'a2']
      };

      await repository.updateWithDiff(
        familyDomainMapper.toPrimitives(family),
        updateDto as unknown as FamilyPrimitives,
        'test-user'
      );

      const updated = await repository.findById(family.idValue);

      expect(updated.name).toBe(updateDto.name);
      expect(updated.slug).toBe(updateDto.slug);
      expect(updated.scientificName).toBe(updateDto.scientificName);
      expect(updated.shortDescription).toBe(updateDto.shortDescription);
      expect(updated.highlights).toEqual(updateDto.highlights);
      expect(updated.aliases).toEqual(updateDto.aliases);
    });

    it('should update metadata on every update', async () => {
      const family = FamilyScenarios.domainRandom();
      await repository.save(family);

      const user = 'random-user';

      await repository.updateWithDiff(
        familyDomainMapper.toPrimitives(family),
        { name: 'Another name' } as unknown as FamilyPrimitives,
        user
      );

      const updated = await repository.findById(family.idValue);

      expect(updated.metadata.createdAt.getTime()).toBe(
        family.metadata.createdAt.getTime()
      );
      expect(updated.metadata.createdBy).toBe(family.metadata.createdBy);
      expect(updated.metadata.updatedBy).toBe(user);
      expect(updated.metadata.updatedAt.getTime()).toBeGreaterThan(
        family.metadata.updatedAt.getTime()
      );
    });

    it('should throw not found error if family does not exist', async () => {
      const nonExistingFamily = FamilyScenarios.domainRandom({
        id: UuidMother.random()
      });

      await expect(
        repository.updateWithDiff(
          familyDomainMapper.toPrimitives(nonExistingFamily),
          { name: 'Name' } as unknown as FamilyPrimitives,
          'test-user'
        )
      ).rejects.toThrow(`Family not found: ${nonExistingFamily.idValue}`);
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

      const all = await repository.findAll();

      expect(all).toHaveLength(2);
      expect(all.some((f) => f.idValue === family1.idValue)).toBe(true);
      expect(all.some((f) => f.idValue === family2.idValue)).toBe(true);
    });

    it('should return empty array if no families exist', async () => {
      const all = await repository.findAll();

      expect(all).toEqual([]);
    });

    it('should apply filter options', async () => {
      const family1 = FamilyScenarios.domainRandom({ name: 'Rose' });
      const family2 = FamilyScenarios.domainRandom({ name: 'Tulip' });

      await repository.save(family1);
      await repository.save(family2);

      const all = await repository.findAll({
        filter: {
          name: { eq: 'Tulip' }
        }
      });

      expect(all).toHaveLength(1);
      expect(all[0]?.idValue).toBe(family2.idValue);
    });

    it('should apply contains filter', async () => {
      const family1 = FamilyScenarios.domainRandom({ name: 'Rose Garden' });
      const family2 = FamilyScenarios.domainRandom({ name: 'Tulip' });

      await repository.save(family1);
      await repository.save(family2);

      const all = await repository.findAll({
        filter: {
          name: { contains: 'Rose' }
        }
      });

      expect(all).toHaveLength(1);
      expect(all[0]?.idValue).toBe(family1.idValue);
    });

    it('should apply startsWith filter', async () => {
      const family1 = FamilyScenarios.domainRandom({ name: 'Rose Alba' });
      const family2 = FamilyScenarios.domainRandom({ name: 'Tulip Alba' });

      await repository.save(family1);
      await repository.save(family2);

      const all = await repository.findAll({
        filter: {
          name: { startsWith: 'Rose' }
        }
      });

      expect(all).toHaveLength(1);
    });

    it('should apply in filter for arrays', async () => {
      const family1 = FamilyScenarios.domainRandom({ name: 'Rose' });
      const family2 = FamilyScenarios.domainRandom({ name: 'Tulip' });
      const family3 = FamilyScenarios.domainRandom({ name: 'Lily' });

      await repository.save(family1);
      await repository.save(family2);
      await repository.save(family3);

      const all = await repository.findAll({
        filter: {
          name: { in: ['Rose', 'Lily'] }
        }
      });

      expect(all).toHaveLength(2);
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

      const all = await repository.findAll({
        filter: {
          aliases: { includes: 'rosa' }
        }
      });

      expect(all).toHaveLength(1);
      expect(all[0]?.idValue).toBe(family1.idValue);
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

      const all = await repository.findAll({
        filter: {
          name: { eq: 'Rose' },
          scientificName: { contains: 'rubiginosa' }
        }
      });

      expect(all).toHaveLength(1);
      expect(all[0]?.idValue).toBe(family1.idValue);
    });

    it('should apply pagination options', async () => {
      const family1 = FamilyScenarios.domainRandom();
      const family2 = FamilyScenarios.domainRandom();
      const family3 = FamilyScenarios.domainRandom();

      await repository.save(family1);
      await repository.save(family2);
      await repository.save(family3);

      const all = await repository.findAll({
        pagination: {
          page: 2,
          limit: 1
        }
      });

      expect(all).toHaveLength(1);
      expect(all[0]?.idValue).toBe(family2.idValue);
    });

    it('should return empty array when page is out of range', async () => {
      const family1 = FamilyScenarios.domainRandom();
      await repository.save(family1);

      const all = await repository.findAll({
        pagination: {
          page: 99,
          limit: 10
        }
      });

      expect(all).toEqual([]);
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

    it('should sort by name ascending', async () => {
      const b = FamilyScenarios.domainRandom({ name: 'B' });
      const a = FamilyScenarios.domainRandom({ name: 'A' });

      await repository.save(b);
      await repository.save(a);

      const all = await repository.findAll({
        sort: {
          name: 'asc'
        }
      });

      expect(all[0]?.name).toBe('A');
    });
  });
});
